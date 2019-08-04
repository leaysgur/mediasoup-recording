module.exports = async (fastify, options, done) => {
  const { router, transports, producers } = fastify.$state;

  fastify.get("/record/capabilities", async () => {
    return router.rtpCapabilities;
  });

  fastify.post("/record/transport/create", async () => {
    const transport = await router
      .createWebRtcTransport({
        // TODO: from state or config
        listenIps: [{ ip: "127.0.0.1" }]
      })
      .catch(console.error);

    transports.set(transport.id, transport);

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    };
  });

  fastify.post("/record/transport/connect", async req => {
    const { transportId, dtlsParameters } = req.body;

    const transport = transports.get(transportId);
    if (!transport)
      throw new Error(`transport with id "${transportId}" not found`);

    await transport.connect({ dtlsParameters }).catch(console.error);

    return {};
  });

  fastify.post("/record/start", async req => {
    const { transportId, kind, rtpParameters } = req.body;

    const transport = transports.get(transportId);
    if (!transport)
      throw new Error(`transport with id "${transportId}" not found`);

    const producer = await transport
      .produce({
        kind,
        rtpParameters
      })
      .catch(console.error);

    producers.set(producer.id, producer);

    return { id: producer.id };
  });

  fastify.post("/record/end", async req => {
    const { producerId } = req.body;

    const producer = producers.get(producerId);
    if (!producer)
      throw new Error(`producer with id "${producerId}" not found`);

    producer.close();

    return {};
  });

  done();
};
