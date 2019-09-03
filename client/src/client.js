import { Device } from "mediasoup-client";

export default class Client {
  constructor(recorder) {
    this._recorder = recorder;
    this._routerId = null;
    this._counter = {
      transport: 0,
      producer: 0
    };
  }

  get counter() {
    const { transport, producer } = this._counter;
    return { transport, producer };
  }

  async start(track, { tNum, pNum }) {
    for (let i = 0; i < tNum; i++) {
      const device = await this._createDevice();
      const sendTransport = await this._createSendTransport(device);
      for (let j = 0; j < pNum; j++) {
        const producer = await sendTransport.produce({ track });
        await this._recorder.start({
          producerId: producer.id,
          routerId: this._routerId
        });
      }
    }
  }

  async _createDevice() {
    const device = new Device();

    const { id, rtpCapabilities } = await this._recorder.initialize();
    await device.load({ routerRtpCapabilities: rtpCapabilities });
    this._routerId = id;

    console.warn(`Router: ${id}`, rtpCapabilities);
    return device;
  }

  async _createSendTransport(device) {
    const transportInfo = await this._recorder.createTransport({
      routerId: this._routerId
    });

    transportInfo.iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
    const sendTransport = device.createSendTransport(transportInfo);

    sendTransport.on(
      "connect",
      async ({ dtlsParameters }, callback, errback) => {
        console.warn("client.sendTransport.on(connect)");
        try {
          await this._recorder.connectTransport({
            transportId: sendTransport.id,
            dtlsParameters
          });
          callback();
          this._counter.transport++;
        } catch (err) {
          errback(err);
        }
      }
    );
    sendTransport.on(
      "produce",
      async ({ kind, rtpParameters }, callback, errback) => {
        console.warn("client.sendTransport.on(produce)");
        try {
          const { id } = await this._recorder.produce({
            transportId: sendTransport.id,
            kind,
            rtpParameters
          });
          callback({ id });
          this._counter.producer++;
        } catch (err) {
          console.error(err);
          errback(err);
        }
      }
    );

    return sendTransport;
  }
}
