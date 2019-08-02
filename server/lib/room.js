const protooServer = require("protoo-server");

class Room {
  constructor(router) {
    this._protooRoom = new protooServer.Room();
    this._router = router;
  }

  handlePeerConnect({ peerId, protooWebSocketTransport }) {
    const existingPeer = this._protooRoom.getPeer(peerId);
    if (existingPeer) {
      console.log("close old peer which has same peerId", peerId);
      existingPeer.close();
    }

    let peer;
    try {
      peer = this._protooRoom.createPeer(peerId, protooWebSocketTransport);
    } catch (err) {
      console.error(err);
      return;
    }

    peer.data.transports = new Map();
    peer.data.producers = new Map();
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

        if (typeof rtpCapabilities !== "object")
          throw new TypeError("missing rtpCapabilities");

        // Store client data into the protoo Peer data object.
        peer.data.rtpCapabilities = rtpCapabilities;

        // Tell the new Peer about already joined Peers.
        // And also create Consumers for existing Producers.
        const peers = [];
        for (const otherPeer of this._getJoinedPeers()) {
          peers.push({ id: otherPeer.id });

          for (const producer of otherPeer.data.producers.values()) {
            this._createConsumer({
              consumerPeer: peer,
              producerPeer: otherPeer,
              producer
            });
          }
        }

        accept({ peers });

        // Mark the new Peer as joined.
        peer.data.joined = true;

        // Notify the new Peer to all other Peers.
        for (const otherPeer of this._getJoinedPeers({ excludePeer: peer })) {
          otherPeer
            .notify("peerJoined", { peerId: peer.id })
            .catch(console.error);
        }

        break;
      }

      case "createWebRtcTransport": {
        const { producing, consuming } = request.data;

        const transport = await this._router.createWebRtcTransport({
          listenIps: [{ ip: "127.0.0.1" }],
          appData: { producing, consuming }
        });

        // Store the WebRtcTransport into the protoo Peer data Object.
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

        if (!transport.appData.producing) {
          console.error(
            "_createConsumer() | WebRtcTransport for consuming not found"
          );
          return;
        }

        // Add peerId into appData to later get the associated Peer.
        appData = Object.assign({ peerId: peer.id }, appData);

        const producer = await transport.produce({
          kind,
          rtpParameters,
          appData
        });

        // Store the Producer into the protoo Peer data Object.
        peer.data.producers.set(producer.id, producer);

        accept({ id: producer.id });

        // Optimization: Create a server-side Consumer for each Peer.
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
        if (!peer.data.joined) throw new Error("Peer not yet joined");

        const { producerId } = request.data;
        const producer = peer.data.producers.get(producerId);

        if (!producer)
          throw new Error(`producer with id "${producerId}" not found`);

        producer.close();

        peer.data.producers.delete(producer.id);
        accept();

        break;
      }

      default: {
        console.log('unknown request.method "%s"', request.method);
        reject(500, `unknown request.method "${request.method}"`);
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
      console.error("_createConsumer() | can not consume!");
      return;
    }

    const transport = Array.from(consumerPeer.data.transports.values()).find(
      t => t.appData.consuming
    );
    if (!transport) {
      console.error(
        "_createConsumer() | WebRtcTransport for consuming not found"
      );
      return;
    }

    const { accept } = await consumerPeer.request("newConsumerOffer", {
      peerId: producerPeer.id,
      kind: producer.kind
    });

    if (!accept) {
      console.log("consume canceled");
      return;
    }

    let consumer;
    try {
      consumer = await transport.consume({
        producerId: producer.id,
        rtpCapabilities: consumerPeer.data.rtpCapabilities,
        // consume with paused to avoid from missing keyframe
        paused: producer.kind === "video"
      });
    } catch (error) {
      console.error("_createConsumer() | transport.consume():%o", error);
      return;
    }

    consumerPeer.data.consumers.set(consumer.id, consumer);

    // Set Consumer events.
    consumer.on("transportclose", () => {
      // Remove from its map.
      consumerPeer.data.consumers.delete(consumer.id);
    });

    consumer.on("producerclose", () => {
      // Remove from its map.
      consumerPeer.data.consumers.delete(consumer.id);
      consumerPeer
        .notify("consumerClosed", { consumerId: consumer.id })
        .catch(console.error);
    });

    // Send a protoo request to the remote Peer with Consumer parameters.
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
      .then(() => {
        // Resume it when accepted
        if (producer.kind === "video") consumer.resume();
      })
      .catch(error => {
        console.error("_createConsumer() | failed:%o", error);
      });
  }
}

module.exports = Room;
