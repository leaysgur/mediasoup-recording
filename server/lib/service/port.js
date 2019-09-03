const dgram = require("dgram");

class PortService {
  constructor({ min, max }) {
    this._pick = () => Math.floor(Math.random() * (max - min)) + 1 + min;
  }

  async getPort() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const port = this._pick();
      const err = await this._check(port);
      if (err) continue;

      return port;
    }
  }

  async _check(port) {
    return new Promise(resolve => {
      const sock = dgram.createSocket("udp4");
      sock.once("error", resolve);
      sock.once("listening", () => {
        sock.close();
        resolve(null);
      });
      sock.bind(port);
    });
  }
}

module.exports = PortService;
