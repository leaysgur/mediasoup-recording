import { Device } from "mediasoup-client";

export default class Client {
  constructor(recorder) {
    this._recorder = recorder;
    this._device = null;
    this._sendTransport = null;
    this._recvTransport = null;
    this._producer = null;
    this._consumer = null;
  }

  async start(track) {
    console.warn("start()", track);

    if (this._device === null) {
      await this._setup();
    }
    if (this._sendTransport === null) {
      await this._connectSendTransport();
    }
    if (this._recvTransport === null) {
      await this._connectRecvTransport();
    }

    // sending
    this._producer = await this._sendTransport
      .produce({ track })
      .catch(console.error);
    console.warn(this._producer);

    // recving to preview
    const info = await this._recorder
      .consume({
        producerId: this._producer.id,
        transportId: this._recvTransport.id,
        rtpCapabilities: this._device.rtpCapabilities
      })
      .catch(console.error);
    this._consumer = await this._recvTransport
      .consume(info)
      .catch(console.error);
    console.warn(this._consumer);

    // start recording
    await this._recorder
      .start({ producerId: this._producer.id })
      .catch(console.error);

    return this._consumer;
  }

  async stop() {
    console.warn("client.stop()");
    this._producer.close();
    this._consumer.close();

    await this._recorder
      .stop({ producerId: this._producer.id })
      .catch(console.error);

    this._producer = null;
    this._consumer = null;
  }

  async _setup() {
    this._device = new Device();

    const routerRtpCapabilities = await this._recorder
      .getCapabilities()
      .catch(console.error);
    await this._device.load({ routerRtpCapabilities }).catch(console.error);

    console.warn(routerRtpCapabilities);
  }

  async _connectSendTransport() {
    const transportInfo = await this._recorder
      .createTransport()
      .catch(console.error);

    transportInfo.iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
    this._sendTransport = this._device.createSendTransport(transportInfo);
    console.warn(this._sendTransport);

    this._sendTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        console.warn("client.sendTransport.on(connect)");
        try {
          await this._recorder.connectTransport({
            transportId: this._sendTransport.id,
            dtlsParameters
          });
          callback();
        } catch (err) {
          errback(err);
        }
      }
    );
    this._sendTransport.on(
      "produce",
      async ({ kind, rtpParameters }, callback, errback) => {
        console.warn("client.sendTransport.on(produce)");
        try {
          const { id } = await this._recorder.produce({
            transportId: this._sendTransport.id,
            kind,
            rtpParameters
          });
          callback({ id });
        } catch (err) {
          console.error(err);
          errback(err);
        }
      }
    );
  }
  async _connectRecvTransport() {
    const transportInfo = await this._recorder
      .createTransport()
      .catch(console.error);

    transportInfo.iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
    this._recvTransport = this._device.createRecvTransport(transportInfo);
    console.warn(this._recvTransport);

    this._recvTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        console.warn("client.recvTransport.on(connect)");
        try {
          await this._recorder.connectTransport({
            transportId: this._recvTransport.id,
            dtlsParameters
          });
          callback();
        } catch (err) {
          errback(err);
        }
      }
    );
  }
}
