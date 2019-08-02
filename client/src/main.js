import {
  onLoad,
  onClickMicCapture,
  onClickMicMute,
  onClickMicUnmute,
  onClickRoomJoin,
  onClickRoomLeave,
  onClickRecStart,
  onClickRecStop
} from "./handlers";
import Room from "./room";

(async () => {
  const peerId = `p:${String(Math.random()).slice(2)}`;
  const state = {
    track: null, // MediaStreamTrack to record
    muted: false, // track is enabled or NOT
    joined: false, // joined the room or NOT
    recording: false, // recording or NOT
    room: new Room(`ws://localhost:2345?peerId=${peerId}`) // room to join
  };

  const els = {
    $micCapture: document.getElementById("mic-capture"),
    $micMute: document.getElementById("mic-mute"),
    $micUnmute: document.getElementById("mic-unmute"),
    $roomJoin: document.getElementById("room-join"),
    $roomLeave: document.getElementById("room-leave"),
    $recStart: document.getElementById("rec-start"),
    $recStop: document.getElementById("rec-stop"),
    $evLogs: document.getElementById("ev-logs")
  };

  const logger = {
    log(data) {
      console.log(data);
      const time = new Date().toLocaleTimeString();
      els.$evLogs.textContent += `${time}: ${data}\n`;
    },
    error(err) {
      console.error(err);
    }
  };

  // attach handlers
  els.$micCapture.onclick = () => onClickMicCapture(state, els, logger);
  els.$micMute.onclick = () => onClickMicMute(state, els, logger);
  els.$micUnmute.onclick = () => onClickMicUnmute(state, els, logger);
  els.$roomJoin.onclick = () => onClickRoomJoin(state, els, logger);
  els.$roomLeave.onclick = () => onClickRoomLeave(state, els, logger);
  els.$recStart.onclick = () => onClickRecStart(state, els, logger);
  els.$recStop.onclick = () => onClickRecStop(state, els, logger);

  state.room.on("consumer", consumer => {
    const { peerId } = consumer.appData;
    logger.log(`peer ${peerId} joined`);
    const $audio = document.createElement("audio");
    $audio.controls = true;
    $audio.srcObject = new MediaStream([consumer.track]);
    $audio.id = consumer.id;
    document.body.append($audio);
  });
  state.room.on("consumerClosed", ({ peerId, consumerId }) => {
    logger.log(`peer ${peerId} leave`);
    document.getElementById(consumerId).remove();
  });

  onLoad(state, els, logger);

  // debug
  await onClickMicCapture(state, els, logger);
  await onClickRoomJoin(state, els, logger);
})();
