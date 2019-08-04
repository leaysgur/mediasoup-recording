const createFastify = require("fastify");
const mediasoup = require("mediasoup");
const formBody = require("fastify-formbody");
const cors = require("fastify-cors");
const recordRoute = require("./lib/record");

(async () => {
  const worker = await mediasoup.createWorker({
    rtcMinPort: 3000,
    rtcMaxPort: 4000
  });

  worker.once("died", () => {
    console.log("mediasoup Worker died, exit..");
    process.exit(1);
  });

  // audio only
  const router = await worker.createRouter({
    mediaCodecs: [
      {
        kind: "audio",
        name: "opus",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2
      }
    ]
  });

  const fastify = createFastify();

  fastify.register(cors);
  fastify.register(formBody);
  fastify.decorate("$state", {
    router,
    // Map<transportId, Transport>
    transports: new Map(),
    // Map<producerId, Producer>
    producers: new Map()
  });

  fastify.register(recordRoute);

  fastify.listen(2345, "127.0.0.1", (err, address) => {
    if (err) {
      console.log("server creation failed, exit..");
      process.exit(1);
    }

    console.log(`server listening on ${address}`);
  });
})();
