import { EventEmitter } from "events";
import { Device } from "mediasoup-client";
import { WebSocketTransport, Peer } from "protoo-client";

export default class Room extends EventEmitter {
  constructor(wsUrl) {
    super();

    this._wsUrl = wsUrl;
    this._peer = null;
    this._device = new Device();
    this._sendTransport = null;
    this._recvTransport = null;
  }

  async join(track) {
    console.warn("room.join()", track);
    const wsTransport = new WebSocketTransport(this._wsUrl);

    this._peer = new Peer(wsTransport);
    this._peer.on("failed", console.error);
    this._peer.on("disconnected", console.error);
    this._peer.on("close", console.error);
    this._peer.on("notification", this._onPeerNotification.bind(this));
    this._peer.on("request", this._onPeerRequest.bind(this));

    await new Promise(r => this._peer.once("open", r));

    console.warn("peer open, create transports");
    const routerRtpCapabilities = await this._peer
      .request("getRouterRtpCapabilities")
      .catch(console.error);
    await this._device.load({ routerRtpCapabilities });

    await this._prepareSendTransport().catch(console.error);
    await this._prepareRecvTransport().catch(console.error);

    await this._peer.request("join", {
      rtpCapabilities: this._device.rtpCapabilities
    });

    const audioProducer = await this._sendTransport
      .produce({
        track
      })
      .catch(console.error);

    console.warn("produce", track);
    audioProducer.on("trackended", async () => {
      console.warn("producer.close() by trackended");
      await this._closeProducer(audioProducer);
    });
  }

  async leave() {
    console.warn("room.leave()");
  }

  async _prepareSendTransport() {
    const transportInfo = await this._peer
      .request("createWebRtcTransport", {
        producing: true,
        consuming: false
      })
      .catch(console.error);

    transportInfo.iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
    this._sendTransport = this._device.createSendTransport(transportInfo);
    this._sendTransport.on(
      "connect",
      ({ dtlsParameters }, callback, errback) => {
        console.warn("room.sendTransport:connect");
        this._peer
          .request("connectWebRtcTransport", {
            transportId: this._sendTransport.id,
            dtlsParameters
          })
          .then(callback)
          .catch(errback);
      }
    );
    this._sendTransport.on(
      "produce",
      async ({ kind, rtpParameters, appData }, callback, errback) => {
        console.warn("room.sendTransport:produce");
        try {
          const { id } = await this._peer.request("produce", {
            transportId: this._sendTransport.id,
            kind,
            rtpParameters,
            appData
          });

          callback({ id });
        } catch (error) {
          errback(error);
        }
      }
    );
  }

  async _prepareRecvTransport() {
    const transportInfo = await this._peer
      .request("createWebRtcTransport", {
        producing: false,
        consuming: true
      })
      .catch(console.error);

    transportInfo.iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
    this._recvTransport = this._device.createRecvTransport(transportInfo);
    this._recvTransport.on(
      "connect",
      ({ dtlsParameters }, callback, errback) => {
        console.warn("room.recvTransport:connect");
        this._peer
          .request("connectWebRtcTransport", {
            transportId: this._recvTransport.id,
            dtlsParameters
          })
          .then(callback)
          .catch(errback);
      }
    );
  }

  async _closeProducer(producer) {
    producer.close();
    await this._peer
      .request("closeProducer", { producerId: producer.id })
      .catch(console.error);
  }

  _onPeerRequest(req, resolve, reject) {
    console.warn("room.peer:request", req.method);
    switch (req.method) {
      case "newConsumer": {
        this._recvTransport
          .consume(req.data)
          .then(consumer => {
            console.warn("consume", consumer);
            this.emit("consumer", consumer);
            resolve();
          })
          .catch(reject);
        break;
      }
      default:
        resolve();
    }
  }

  _onPeerNotification(notification) {
    console.warn("room.peer:notification", notification.method);
    this.emit(notification.method, notification.data);
  }
}
