const spawnGStreamer = require("../gstreamer");
const { pickNumberFromRange } = require("../utils");

class RecordService {
  constructor() {
    // Map<transportId, Transport>
    this._transports = new Map();
    // Map<producerId, { Producer, PlainRtpTransport, PlainRtpConsumer, recordProcess }>
    this._producerItems = new Map();
  }

  async createTransport(router, serverIp) {
    const transport = await router.createWebRtcTransport({
      listenIps: [{ ip: serverIp }]
    });

    this._transports.set(transport.id, transport);

    // client close browser
    transport.on("dtlsstatechange", state => {
      if (state !== "closed") return;
      transport.close();
      this._transports.delete(transport.id);
    });

    return transport;
  }

  async connectTransport(transportId, params) {
    const transport = this._transports.get(transportId);
    if (!transport)
      throw new Error(`transport with id "${transportId}" not found`);

    await transport.connect(params);
  }

  async createProducer(transportId, params) {
    const transport = this._transports.get(transportId);
    if (!transport)
      throw new Error(`transport with id "${transportId}" not found`);

    const producer = await transport.produce(params);

    // client close browser => transportclose => close producerItem
    producer.once("transportclose", () => {
      const producerItem = this._producerItems.get(producer.id);
      if (!producerItem) return;

      const {
        producer,
        rtpTransport,
        rtpConsumer,
        recordProcess
      } = producerItem;
      producer.close();
      console.log(`producer closed with id ${producer.id}`);
      rtpTransport.close();
      console.log("rtpTransport closed on", rtpTransport.tuple);
      rtpConsumer.close();
      console.log(`rtpConsumer closed with id ${rtpConsumer.id}`);
      // gst-launch needs SIGINT
      recordProcess.kill("SIGINT");
      console.log(`process killed with pid ${recordProcess.pid}`);

      this._producerItems.delete(producer.id);
    });

    this._producerItems.set(producer.id, {
      producer,
      rtpTransport: null,
      rtpConsumer: null,
      recordProcess: null
    });

    return producer;
  }

  async createProducerItems(
    router,
    producerId,
    { serverIp, recMinPort, recMaxPort, recordDir }
  ) {
    const producerItem = this._producerItems.get(producerId);
    if (!producerItem)
      throw new Error(`producerItem with id "${producerId}" not found`);

    const rtpTransport = await router.createPlainRtpTransport({
      listenIp: serverIp
    });

    // TODO: strict
    const remotePort = pickNumberFromRange(recMinPort, recMaxPort);
    await rtpTransport.connect({ ip: serverIp, port: remotePort });

    console.log("rtpTransport created on", rtpTransport.tuple);

    const rtpConsumer = await rtpTransport.consume({
      producerId,
      rtpCapabilities: router.rtpCapabilities
    });

    console.log(`rtpConsumer created with id ${rtpConsumer.id}`);

    const ps = spawnGStreamer(
      rtpTransport.tuple.remotePort,
      router.rtpCapabilities.codecs[0],
      `${recordDir}/${producerId}.ogg`
    );
    console.log("recording process spawned with pid", ps.pid);

    ps.on("exit", (code, signal) => {
      // killed by SIGNINT
      if (code === 2 && signal === null) return;

      console.log("recording process exited unexpectedly!");
      console.log(`process exited with code: ${code}, signal: ${signal}`);
    });

    producerItem.rtpTransport = rtpTransport;
    producerItem.rtpConsumer = rtpConsumer;
    producerItem.recordProcess = ps;
  }
}

module.exports = RecordService;
