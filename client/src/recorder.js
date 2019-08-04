export default class Record {
  constructor(serverUrl) {
    this._url = serverUrl;
  }

  async getCapabilities() {
    console.warn("recorder.getCapabilities()");
    const routerRtpCapabilities = await this._fetch("/record/capabilities", {
      method: "GET"
    }).then(res => res.json());
    return routerRtpCapabilities;
  }

  async createTransport() {
    console.warn("recorder.createTransport()");
    const transportInfo = await this._fetch("/record/transport/create", {
      method: "POST"
    });
    return transportInfo;
  }

  async connectTransport() {
    console.warn("recorder.connectTransport()");
    await this._fetch("/record/transport/connect", {
      method: "POST"
    });
    return null;
  }

  async start(body) {
    console.warn("recorder.start()");
    const res = await this._fetch("/record/start", {
      method: "POST",
      body
    });
    return res;
  }

  async stop(body) {
    console.warn("recorder.stop()");
    const res = await this._fetch("/record/stop", {
      method: "POST",
      body
    });
    return res;
  }

  async _fetch(url, options) {
    const res = await fetch(`${this._url}${url}`, options);
    return res;
  }
}
