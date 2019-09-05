const fs = require("fs");
const createFastify = require("fastify");
const cors = require("fastify-cors");
const config = require("./config");
const recordRoute = require("./lib/routes/record");
const MediaSoupService = require("./lib/service/mediasoup");
const RecordService = require("./lib/service/record");

(async () => {
  // ensure directory exists
  fs.accessSync(config.record.recordDir);

  const service = {
    mediasoup: new MediaSoupService(),
    record: new RecordService()
  };

  await service.mediasoup.initialize(config.mediasoup);

  const fastify = createFastify();

  fastify.register(cors);

  fastify.decorate("$config", config);
  fastify.decorate("$service", service);

  fastify.register(recordRoute);
  fastify.get("/stats", async () => {
    return service.record.stats;
  });

  fastify.listen(
    config.rest.serverPort,
    config.rest.serverIp,
    (err, address) => {
      if (err) {
        console.log("server creation failed, exit..");
        process.exit(1);
      }

      console.log(`server listening on ${address}`);
    }
  );
})();
