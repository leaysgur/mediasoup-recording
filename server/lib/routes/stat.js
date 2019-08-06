module.exports = async (fastify, options, done) => {
  const { producerItems } = fastify.$state;

  fastify.post("/stat", async req => {
    const { producerId } = JSON.parse(req.body);

    const res = {
      server: {
        nowProducingItems: producerItems.size
      },
      yours: {}
    };

    const producerItem = producerItems.get(producerId);
    if (!producerItem) return res;

    const {
      producer,
      consumer,
      rtpTransport,
      rtpConsumer,
      recordProcess
    } = producerItem;

    return Object.assign(res, {
      yours: {
        producerId: producer.id,
        consumerId: consumer.id,
        rtpTransportId: rtpTransport.id,
        rtpConsumerId: rtpConsumer.id,
        recordProcessId: recordProcess.pid
      }
    });
  });

  done();
};
