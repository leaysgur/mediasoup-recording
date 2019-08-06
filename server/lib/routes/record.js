const spawnGStreamer = require("../gstreamer");
const { pickNumberFromRange } = require("../utils");

module.exports = async (fastify, options, done) => {
  const { serverIp, recMinPort, recMaxPort, recordDir } = fastify.$config;
  const { router, transports, producerItems } = fastify.$state;

  fastify.get("/record/capabilities", async () => {
    return router.rtpCapabilities;
  });

  fastify.post("/record/transport/create", async () => {
    const transport = await router
      .createWebRtcTransport({
        listenIps: [{ ip: serverIp }]
      })
      .catch(console.error);

    // client close browser
    transport.on("dtlsstatechange", state => {
      if (state !== "closed") return;
      transport.close();
      transports.delete(transport.id, transport);
    });

    transports.set(transport.id, transport);
    console.log(`transport created with id ${transport.id}`);

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    };
  });

  fastify.post("/record/transport/connect", async req => {
    const { transportId, dtlsParameters } = JSON.parse(req.body);

    const transport = transports.get(transportId);
    if (!transport)
      throw new Error(`transport with id "${transportId}" not found`);

    await transport.connect({ dtlsParameters }).catch(console.error);
    console.log(`transport with id ${transport.id} connected`);

    return {};
  });

  fastify.post("/record/produce", async req => {
    const { transportId, kind, rtpParameters } = JSON.parse(req.body);

    const transport = transports.get(transportId);
    if (!transport)
      throw new Error(`transport with id "${transportId}" not found`);

    const producer = await transport
      .produce({
        kind,
        rtpParameters
      })
      .catch(console.error);

    const producerId = producer.id;

    // client close browser => transportclose => close producerItem
    producer.once("transportclose", () => {
      // XXX: same as /record/stop handler...
      const producerItem = producerItems.get(producerId);
      if (!producerItem) return;

      const {
        producer,
        consumer,
        rtpTransport,
        rtpConsumer,
        recordProcess
      } = producerItem;
      producer.close();
      console.log(`producer closed with id ${producerId}`);
      consumer.close();
      console.log(`consumer closed with id ${consumer.id}`);
      rtpTransport.close();
      console.log("rtpTransport closed on", rtpTransport.tuple);
      rtpConsumer.close();
      console.log(`rtpConsumer closed with id ${rtpConsumer.id}`);
      // gst-launch needs SIGINT
      recordProcess.kill("SIGINT");
      console.log(`process killed with pid ${recordProcess.pid}`);

      producerItems.delete(producerId);
    });

    console.log(`producer created with id ${producer.id}`);

    producerItems.set(producerId, {
      producer,
      consumer: null,
      rtpTransport: null,
      rtpConsumer: null,
      recordProcess: null
    });

    return { id: producerId };
  });

  fastify.post("/record/consume", async req => {
    const { producerId, transportId, rtpCapabilities } = JSON.parse(req.body);

    const transport = transports.get(transportId);
    if (!transport)
      throw new Error(`transport with id "${transportId}" not found`);

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities: rtpCapabilities
    });
    console.log(`consumer created with id ${consumer.id}`);

    const producerItem = producerItems.get(producerId);
    if (!producerItem)
      throw new Error(`producerItem with id "${producerId}" not found`);

    producerItem.consumer = consumer;

    return {
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters
    };
  });

  fastify.post("/record/start", async req => {
    const { producerId } = JSON.parse(req.body);

    const producerItem = producerItems.get(producerId);
    if (!producerItem)
      throw new Error(`producerItem with id "${producerId}" not found`);

    const rtpTransport = await router
      .createPlainRtpTransport({ listenIp: serverIp })
      .catch(console.error);

    const remotePort = pickNumberFromRange(recMinPort, recMaxPort);
    await rtpTransport
      .connect({ ip: serverIp, port: remotePort })
      .catch(console.error);

    console.log("rtpTransport created on", rtpTransport.tuple);

    const rtpConsumer = await rtpTransport
      .consume({
        producerId,
        rtpCapabilities: router.rtpCapabilities
      })
      .catch(console.error);

    console.log(`rtpConsumer created with id ${rtpConsumer.id}`);

    const ps = spawnGStreamer(
      rtpTransport.tuple.remotePort,
      router.rtpCapabilities.codecs[0],
      `${recordDir}/${producerId}.ogg`
    );
    console.log("recording process spawned with pid", ps.pid);

    ps.on("exit", (code, signal) => {
      console.log(`process exited with code: ${code}, signal: ${signal}`);
    });

    producerItem.rtpTransport = rtpTransport;
    producerItem.rtpConsumer = rtpConsumer;
    producerItem.recordProcess = ps;

    return {};
  });

  fastify.post("/record/stop", async req => {
    const { producerId } = JSON.parse(req.body);

    const producerItem = producerItems.get(producerId);
    if (!producerItem)
      throw new Error(`producerItem with id "${producerId}" not found`);

    const {
      producer,
      consumer,
      rtpTransport,
      rtpConsumer,
      recordProcess
    } = producerItem;
    producer.close();
    console.log(`producer closed with id ${producerId}`);
    consumer.close();
    console.log(`consumer closed with id ${consumer.id}`);
    rtpTransport.close();
    console.log("rtpTransport closed on", rtpTransport.tuple);
    rtpConsumer.close();
    console.log(`rtpConsumer closed with id ${rtpConsumer.id}`);
    // gst-launch needs SIGINT
    recordProcess.kill("SIGINT");
    console.log(`process killed with pid ${recordProcess.pid}`);

    producerItems.delete(producerId);

    return {};
  });

  done();
};
