module.exports = {
  serverIp: "127.0.0.1",
  serverPort: 2345,
  rtcMinPort: 3001,
  rtcMaxPort: 4000,
  recMinPort: 4001,
  recMaxPort: 5000,
  recordDir: "./record",
  mediaCodecs: [
    {
      kind: "audio",
      name: "opus",
      mimeType: "audio/opus",
      clockRate: 48000,
      channels: 2
    }
  ]
};
