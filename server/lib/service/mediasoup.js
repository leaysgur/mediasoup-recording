const mediasoup = require("mediasoup");

class MediaSoupService {
  constructor() {
    this._workers = [];
    this._routers = [];
    this._nextIdx = -1;
  }

  get rtpCapabilities() {
    return this._routers[0].rtpCapabilities;
  }

  async initialize({ numWorkers, rtcMinPort, rtcMaxPort, mediaCodecs }) {
    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker({ rtcMinPort, rtcMaxPort });
      worker.once("died", () => {
        console.log("mediasoup Worker died, exit..");
        process.exit(1);
      });
      this._workers.push(worker);

      const router = await worker.createRouter({ mediaCodecs });
      this._routers.push(router);
    }

    console.log(`${this._workers.length} workers and routers are created`);
  }

  getRouter(routerId) {
    if (routerId) {
      const router = this._routers.find(r => r.id === routerId);
      return router;
    }

    const idx = ++this._nextIdx % this._routers.length;
    return this._routers[idx];
  }
}

module.exports = MediaSoupService;
