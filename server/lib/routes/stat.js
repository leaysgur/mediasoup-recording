module.exports = async (fastify, options, done) => {
  const { transports, producers } = fastify.$state;

  fastify.get("/stat", async () => {
    return {
      transports: transports.size,
      producers: producers.size
    };
  });

  done();
};
