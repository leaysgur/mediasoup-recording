module.exports = {
  mediasoup: {
    numWorkers: 1,
    // numWorkers: require("os").cpus().length,
    serverIp: "127.0.0.1",
    rtcMinPort: 3001,
    rtcMaxPort: 4000,
    mediaCodecs: [
      {
        kind: "audio",
        name: "opus",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2
      }
    ]
  },
  record: {
    recMinPort: 4001,
    recMaxPort: 5000,
    recordDir: "./record"
  },
  rest: {
    serverIp: "127.0.0.1",
    serverPort: 2345
  }
};
