class PortService {
  constructor({ min, max }) {
    this._limit = max - min;
    this._pick = () => Math.floor(Math.random() * (max - min)) + 1 + min;
    this._used = new Set();
  }

  getPort() {
    if (this._limit <= this._used.size)
      throw new Error("No more ports available!");

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const port = this._pick();
      if (this._used.has(port)) {
        continue;
      }

      this._used.add(port);
      return port;
    }
  }
}

module.exports = PortService;
