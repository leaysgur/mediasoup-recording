const createFastify = require("fastify");
const mediasoup = require("mediasoup");
const formBody = require("fastify-formbody");
const cors = require("fastify-cors");
const statRoute = require("./lib/routes/stat");
const recordRoute = require("./lib/routes/record");

(async () => {
  const serverIp = "127.0.0.1";
  const serverPort = 2345;

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

  fastify.decorate("$config", {
    serverIp,
    serverPort
  });
  // TODO: detect missing transport and producer(eg. client disappear)
  fastify.decorate("$state", {
    router,
    // Map<transportId, Transport>
    transports: new Map(),
    // Map<producerId, [Producer, PlainRtpTransport, Consumer]>
    producerItems: new Map()
  });

  fastify.register(recordRoute);
  fastify.register(statRoute);

  fastify.listen(serverPort, serverIp, (err, address) => {
    if (err) {
      console.log("server creation failed, exit..");
      process.exit(1);
    }

    console.log(`server listening on ${address}`);
  });
})();
