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

(async () => {
  const state = {
    track: null, // MediaStreamTrack to record
    muted: false, // track is enabled or NOT
    joined: false, // joined the room or NOT
    recording: false // recording or NOT
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
  onLoad(state, els, logger);
  els.$micCapture.onclick = () => onClickMicCapture(state, els, logger);
  els.$micMute.onclick = () => onClickMicMute(state, els, logger);
  els.$micUnmute.onclick = () => onClickMicUnmute(state, els, logger);
  els.$roomJoin.onclick = () => onClickRoomJoin(state, els, logger);
  els.$roomLeave.onclick = () => onClickRoomLeave(state, els, logger);
  els.$recStart.onclick = () => onClickRecStart(state, els, logger);
  els.$recStop.onclick = () => onClickRecStop(state, els, logger);
})();
