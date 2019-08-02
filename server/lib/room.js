const protooServer = require("protoo-server");

class Room {
  constructor(router) {
    this._protooRoom = new protooServer.Room();
    this._router = router;
  }

  handlePeerConnect(peerId, transport) {
    let peer;
    try {
      peer = this._protooRoom.createPeer(peerId, transport);
    } catch (err) {
      console.error(err);
      return;
    }

    // send + recv = 2 transports
    peer.data.transports = new Map();
    // send only 1 audio producer
    peer.data.producer = null;
    // recv N consumers
    peer.data.consumers = new Map();

    peer.on("request", (request, accept, reject) => {
      this._handleProtooRequest(peer, request, accept, reject).catch(err => {
        console.error(err);
        reject(err);
      });
    });

    peer.on("close", () => {
      console.log("peer closed", peer.id);

      for (const otherPeer of this._getJoinedPeers({ excludePeer: peer })) {
        otherPeer
          .notify("peerClosed", { peerId: peer.id })
          .catch(console.error);
      }

      for (const transport of peer.data.transports.values()) {
        transport.close();
      }

      if (this._protooRoom.peers.length === 0) {
        console.log("last Peer in the room left");
      }
    });
  }

  async _handleProtooRequest(peer, request, accept, reject) {
    console.log(`request:${request.method}`);
    switch (request.method) {
      case "getRouterRtpCapabilities": {
        accept(this._router.rtpCapabilities);
        break;
      }

      case "join": {
        if (peer.data.joined) throw new Error("Peer already joined");

        const { rtpCapabilities } = request.data;
        peer.data.rtpCapabilities = rtpCapabilities;

        for (const otherPeer of this._getJoinedPeers()) {
          this._createConsumer({
            consumerPeer: peer,
            producerPeer: otherPeer,
            producer: otherPeer.data.producer
          });
        }

        accept();
        peer.data.joined = true;

        break;
      }

      case "createWebRtcTransport": {
        const { producing, consuming } = request.data;

        const transport = await this._router
          .createWebRtcTransport({
            listenIps: [{ ip: "127.0.0.1" }],
            appData: { producing, consuming }
          })
          .catch(console.error);

        peer.data.transports.set(transport.id, transport);

        accept({
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters
        });

        break;
      }

      case "connectWebRtcTransport": {
        const { transportId, dtlsParameters } = request.data;
        const transport = peer.data.transports.get(transportId);

        if (!transport)
          throw new Error(`transport with id "${transportId}" not found`);

        await transport.connect({ dtlsParameters });
        accept();

        break;
      }

      case "produce": {
        if (!peer.data.joined) throw new Error("Peer not yet joined");

        const { transportId, kind, rtpParameters } = request.data;
        let { appData } = request.data;
        const transport = peer.data.transports.get(transportId);

        if (!transport)
          throw new Error(`transport with id "${transportId}" not found`);

        appData = Object.assign({ peerId: peer.id }, appData);

        const producer = await transport.produce({
          kind,
          rtpParameters,
          appData
        });

        peer.data.producer = producer;

        accept({ id: producer.id });

        for (const otherPeer of this._getJoinedPeers({ excludePeer: peer })) {
          this._createConsumer({
            consumerPeer: otherPeer,
            producerPeer: peer,
            producer
          });
        }

        break;
      }

      case "closeProducer": {
        const { producerId } = request.data;
        const producer = peer.data.producer;

        if (!producer)
          throw new Error(`producer with id "${producerId}" not found`);

        producer.close();

        peer.data.producer = null;
        accept();

        break;
      }

      default: {
        console.error("unknown request");
        reject(500);
      }
    }
  }

  _getJoinedPeers({ excludePeer } = { excludePeer: null }) {
    return this._protooRoom.peers.filter(
      peer => peer.data.joined && peer !== excludePeer
    );
  }

  async _createConsumer({ consumerPeer, producerPeer, producer }) {
    if (
      !this._router.canConsume({
        producerId: producer.id,
        rtpCapabilities: consumerPeer.data.rtpCapabilities
      })
    ) {
      console.error("can not consume!");
      return;
    }

    const transport = Array.from(consumerPeer.data.transports.values()).find(
      t => t.appData.consuming
    );

    let consumer;
    try {
      consumer = await transport.consume({
        producerId: producer.id,
        rtpCapabilities: consumerPeer.data.rtpCapabilities
      });
    } catch (err) {
      console.error(err);
      return;
    }

    consumerPeer.data.consumers.set(consumer.id, consumer);

    consumer.on("transportclose", () => {
      consumerPeer.data.consumers.delete(consumer.id);
    });

    consumer.on("producerclose", () => {
      consumerPeer.data.consumers.delete(consumer.id);
      consumerPeer
        .notify("consumerClosed", {
          peerId: producerPeer.id,
          consumerId: consumer.id
        })
        .catch(console.error);
    });

    await consumerPeer
      .request("newConsumer", {
        peerId: producerPeer.id,
        producerId: producer.id,
        id: consumer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type,
        appData: producer.appData,
        producerPaused: consumer.producerPaused
      })
      .catch(console.error);
  }
}

module.exports = Room;
