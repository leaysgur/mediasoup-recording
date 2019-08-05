import Recorder from "./recorder";
import Client from "./client";
import {
  onLoad,
  onClickMicCapture,
  onClickMicMute,
  onClickMicUnmute,
  onClickRecStart,
  onClickRecStop
} from "./handlers";

(async () => {
  const state = {
    track: null, // MediaStreamTrack to record
    muted: false, // track is enabled or NOT
    recording: false // recording or NOT
  };

  const els = {
    $micCapture: document.getElementById("mic-capture"),
    $micAudio: document.getElementById("mic-audio"),
    $micMute: document.getElementById("mic-mute"),
    $micUnmute: document.getElementById("mic-unmute"),
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
  const recorder = new Recorder("http://localhost:2345");
  const client = new Client(recorder);

  const context = {
    logger,
    client
  };

  // attach handlers
  els.$micCapture.onclick = () => onClickMicCapture(state, els, context);
  els.$micMute.onclick = () => onClickMicMute(state, els, context);
  els.$micUnmute.onclick = () => onClickMicUnmute(state, els, context);
  els.$recStart.onclick = () => onClickRecStart(state, els, context);
  els.$recStop.onclick = () => onClickRecStop(state, els, context);

  console.warn(state, context);
  onLoad(state, els, context);
})();
