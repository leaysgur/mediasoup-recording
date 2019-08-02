const http = require("http");
const mediasoup = require("mediasoup");
const { WebSocketServer } = require("protoo-server");
const Room = require("./lib/room");

(async () => {
  console.log("create single mediasoup worker");
  const worker = await mediasoup.createWorker({
    rtcMinPort: 3000,
    rtcMaxPort: 4000
  });

  worker.once("died", () => {
    console.log("mediasoup Worker died, exit..");
    process.exit(1);
  });

  console.log("create router accepts audio only");
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

  console.log("create room");
  const room = new Room(router);

  console.log("create http, ws servers");
  const httpServer = http.createServer();
  const wsServer = new WebSocketServer(httpServer);

  wsServer.on("connectionrequest", (info, accept) => {
    console.log(info.socket.remoteAddress, info.origin);

    // TODO: get peerId

    room.handlePeerConnect({
      // to be more and more strict
      peerId: `p${String(Math.random()).slice(2)}`,
      protooWebSocketTransport: accept()
    });
  });

  httpServer.listen(2345, "127.0.0.1", () => {
    console.log("server started", httpServer.address());
  });
})();
