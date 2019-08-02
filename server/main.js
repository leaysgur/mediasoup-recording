const http = require("http");
const { WebSocketServer } = require("protoo-server");
const mediasoup = require("mediasoup");
// const ConfRoom = require("./lib/Room");

class ConfRoom {
  handlePeerConnect() {}
  getStatus() {}
}

(async () => {
  const worker = await mediasoup.createWorker({
    rtcMinPort: 3000,
    rtcMaxPort: 4000
  });

  worker.on("died", () => {
    console.log("mediasoup Worker died, exit..");
    process.exit(1);
  });

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

  const room = new ConfRoom(router);

  const httpServer = http.createServer();
  await new Promise(resolve => {
    httpServer.listen(2345, "127.0.0.1", resolve);
  });

  const wsServer = new WebSocketServer(httpServer);
  wsServer.on("connectionrequest", (info, accept) => {
    console.log(
      "protoo connection request [peerId:%s, address:%s, origin:%s]",
      info.socket.remoteAddress,
      info.origin
    );

    room.handlePeerConnect({
      // to be more and more strict
      peerId: `p${String(Math.random()).slice(2)}`,
      protooWebSocketTransport: accept()
    });
  });

  console.log("websocket server started on http://127.0.0.1:2345");
  setInterval(() => console.log("room stat", room.getStatus()), 1000 * 5);
})();
