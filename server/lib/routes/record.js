module.exports = async (fastify, options, done) => {
  const { serverIp } = fastify.$config;
  const { router, transports, producers } = fastify.$state;

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

    console.log(`rtpTransport created on ${rtpTransport.tuple}`);

    const consumer = await rtpTransport
      .consume({
        producerId: producer.id,
        rtpCapabilities: router.rtpCapabilities
      })
      .catch(console.error);

    console.log(`consumer created with id ${consumer.id}`);

    producers.set(producer.id, [producer, rtpTransport, consumer]);

    return { id: producer.id };
  });

  fastify.post("/record/stop", async req => {
    const { producerId } = JSON.parse(req.body);

    const producer = producers.get(producerId);
    if (!producer)
      throw new Error(`producer with id "${producerId}" not found`);

    producer.forEach(p => p.close());
    producers.delete(producerId);
    console.log(`producer closed with id ${producerId}`);

    return {};
  });

  done();
};
