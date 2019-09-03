export default class Record {
  constructor(serverUrl) {
    this._url = serverUrl;
  }

  async initialize() {
    console.warn("recorder.initialize()");
    const routerInfo = await this._fetch("/record/initialize", {});
    return routerInfo;
  }

  async createTransport(body) {
    console.warn("recorder.createTransport()");
    const transportInfo = await this._fetch("/record/transport/create", body);
    return transportInfo;
  }

  async connectTransport(body) {
    console.warn("recorder.connectTransport()", body);
    await this._fetch("/record/transport/connect", body);
    return null;
  }

  async produce(body) {
    console.warn("recorder.produce()", body);
    const res = await this._fetch("/record/produce", body);
    return res;
  }

  async start(body) {
    console.warn("recorder.start()", body);
    await this._fetch("/record/start", body);
    return null;
  }

  async _fetch(path, body) {
    const res = await fetch(`${this._url}${path}`, {
      method: "post",
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(body)
    });

    const json = await res.json();

    if (json.error) {
      throw new Error(`${json.error}: ${json.message}`);
    }

    return json;
  }
}
