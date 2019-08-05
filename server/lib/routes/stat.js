module.exports = async (fastify, options, done) => {
  const { transports, producerItems } = fastify.$state;

  fastify.get("/stat", async () => {
    return {
      transports: transports.size,
      producerItems: producerItems.size
    };
  });

  done();
};
