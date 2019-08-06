const spawnGStreamer = require("../gstreamer");
const { pickIpFromRange } = require("../utils");

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

    console.log(`producer created with id ${producer.id}`);

    producerItems.set(producer.id, {
      producer,
      consumer: null, // for consumer
      rtpTransport: null, // for rtpTransport
      rtpConsumer: null, // for rtpConsumer
      recordProcess: null // for record process
    });

    return { id: producer.id };
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

    const remotePort = pickIpFromRange(recMinPort, recMaxPort);
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

    const {
      codecs: [{ preferredPayloadType }]
    } = router.rtpCapabilities;

    const ps = spawnGStreamer(
      rtpTransport.tuple.remotePort,
      preferredPayloadType,
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
