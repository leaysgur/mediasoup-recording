import { Device } from "mediasoup-client";

export default class Client {
  constructor(recorder) {
    this._recorder = recorder;
    this._device = null;
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
    if (this._device === null) {
      await this._setupDevice();
    }

    for (let i = 0; i < tNum; i++) {
      const sendTransport = await this._createSendTransport();
      for (let j = 0; j < pNum; j++) {
        const producer = await sendTransport.produce({ track });
        await this._recorder.start({ producerId: producer.id });
      }
    }
  }

  async _setupDevice() {
    this._device = new Device();

    const routerRtpCapabilities = await this._recorder.getCapabilities();
    await this._device.load({ routerRtpCapabilities });

    console.warn(routerRtpCapabilities);
  }

  async _createSendTransport() {
    const transportInfo = await this._recorder.createTransport();

    transportInfo.iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
    const sendTransport = this._device.createSendTransport(transportInfo);

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
