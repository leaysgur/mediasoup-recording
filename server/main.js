const fs = require("fs");
const createFastify = require("fastify");
const mediasoup = require("mediasoup");
const formBody = require("fastify-formbody");
const cors = require("fastify-cors");
const config = require("./config");
const statRoute = require("./lib/routes/stat");
const recordRoute = require("./lib/routes/record");

(async () => {
  // ensure directory exists
  fs.accessSync(config.recordDir);

  // TODO: use multiple worker and balance
  const worker = await mediasoup.createWorker({
    rtcMinPort: config.rtcMinPort,
    rtcMaxPort: config.rtcMaxPort
  });
  worker.once("died", () => {
    console.log("mediasoup Worker died, exit..");
    process.exit(1);
  });

  const router = await worker.createRouter({
    mediaCodecs: config.mediaCodecs
  });

  const fastify = createFastify();

  fastify.register(cors);
  fastify.register(formBody);

  fastify.decorate("$config", config);
  fastify.decorate("$state", {
    router,
    // Map<transportId, Transport>
    transports: new Map(),
    // Map<producerId, { Producer, Consumer, PlainRtpTransport, PlainRtpConsumer, recordProcess }>
    producerItems: new Map()
  });

  fastify.register(recordRoute);
  fastify.register(statRoute);

  fastify.listen(config.serverPort, config.serverIp, (err, address) => {
    if (err) {
      console.log("server creation failed, exit..");
      process.exit(1);
    }

    console.log(`server listening on ${address}`);
  });
})();
