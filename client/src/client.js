import { EventEmitter } from "events";
import { Device } from "mediasoup-client";

export default class Client extends EventEmitter {
  constructor(recorder) {
    super();

    this._recorder = recorder;
    this._device = new Device();
    this._sendTransport = null;
    this._producer = null;
  }

  async setup() {
    console.warn("client.setup()");
    const routerRtpCapabilities = await this._recorder
      .getCapabilities()
      .catch(console.error);
    await this._device.load({ routerRtpCapabilities }).catch(console.error);
    console.warn(routerRtpCapabilities);
  }

  async start(track) {
    console.warn("start()", track);
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
          const { id } = await this._recorder.start({
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

    const audioProducer = await this._sendTransport
      .produce({ track })
      .catch(console.error);
    console.warn(audioProducer);

    this._producer = audioProducer;
  }

  async stop() {
    console.warn("client.stop()");
    this._producer.close();

    await this._recorder
      .stop({ producerId: this._producer.id })
      .catch(console.error);
    console.warn("stopped");
  }
}
