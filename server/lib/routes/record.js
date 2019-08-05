const spawnGStreamer = require("../gstreamer");

module.exports = async (fastify, options, done) => {
  const { serverIp } = fastify.$config;
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

  fastify.post("/record/start", async req => {
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

    const rtpTransport = await router
      .createPlainRtpTransport({
        listenIp: serverIp
      })
      .catch(console.error);

    console.log("rtpTransport created on", rtpTransport.tuple);

    const ps = spawnGStreamer(
      rtpTransport.tuple.localPort,
      `./files/${producer.id}.ogg`
    );
    console.log("recording process spawned", ps.pid);

    const rtpConsumer = await rtpTransport
      .consume({
        producerId: producer.id,
        rtpCapabilities: router.rtpCapabilities
      })
      .catch(console.error);

    console.log(`rtpConsumer created with id ${rtpConsumer.id}`);

    producerItems.set(producer.id, [
      producer,
      null, // for consumer
      rtpTransport,
      rtpConsumer,
      ps
    ]);

    return { id: producer.id };
  });

  fastify.post("/record/consume", async req => {
    const { producerId, transportId } = JSON.parse(req.body);

    const transport = transports.get(transportId);
    if (!transport)
      throw new Error(`transport with id "${transportId}" not found`);

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities: router.rtpCapabilities
    });
    console.log(`consumer created with id ${consumer.id}`);

    const producerItem = producerItems.get(producerId);
    if (!producerItem)
      throw new Error(`producerItem with id "${producerId}" not found`);

    producerItem.splice(1, 1, consumer);

    return {
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters
    };
  });

  fastify.post("/record/stop", async req => {
    const { producerId } = JSON.parse(req.body);

    const producerItem = producerItems.get(producerId);
    if (!producerItem)
      throw new Error(`producerItem with id "${producerId}" not found`);

    const [producer, consumer, rtpTransport, rtpConsumer, ps] = producerItem;
    producer.close();
    console.log(`producer closed with id ${producerId}`);
    consumer.close();
    console.log(`consumer closed with id ${consumer.id}`);
    rtpTransport.close();
    console.log("rtpTransport closed on", rtpTransport.tuple);
    rtpConsumer.close();
    console.log(`rtpConsumer closed with id ${rtpConsumer.id}`);
    ps.kill();
    console.log(`process killed with id ${ps.pid}`);

    producerItems.delete(producerId);

    return {};
  });

  done();
};
