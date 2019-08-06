export default class Record {
  constructor(serverUrl) {
    this._url = serverUrl;
  }

  async getCapabilities() {
    console.warn("recorder.getCapabilities()");
    const routerRtpCapabilities = await this._fetch("/record/capabilities", {
      method: "GET"
    });
    return routerRtpCapabilities;
  }

  async createTransport() {
    console.warn("recorder.createTransport()");
    const transportInfo = await this._fetch("/record/transport/create", {
      method: "POST"
    });
    return transportInfo;
  }

  async connectTransport(body) {
    console.warn("recorder.connectTransport()", body);
    await this._fetch("/record/transport/connect", {
      method: "POST",
      body
    });
    return null;
  }

  async produce(body) {
    console.warn("recorder.produce()", body);
    const res = await this._fetch("/record/produce", {
      method: "POST",
      body
    });
    return res;
  }

  async consume(body) {
    console.warn("recorder.consume()", body);
    const res = await this._fetch("/record/consume", {
      method: "POST",
      body
    });
    return res;
  }

  async start(body) {
    console.warn("recorder.start()", body);
    await this._fetch("/record/start", {
      method: "POST",
      body
    });
    return null;
  }

  async stop(body) {
    console.warn("recorder.stop()", body);
    await this._fetch("/record/stop", {
      method: "POST",
      body
    });
    return null;
  }

  async stat(body) {
    console.warn("recorder.stat()", body);
    const res = await this._fetch("/stat", {
      method: "POST",
      body
    });
    return res;
  }

  async _fetch(url, options) {
    if ("body" in options) {
      options.body = JSON.stringify(options.body);
    }

    const res = await fetch(`${this._url}${url}`, options);
    const json = await res.json();

    if (json.error) {
      throw new Error(`${json.error}: ${json.message}`);
    }

    return json;
  }
}
