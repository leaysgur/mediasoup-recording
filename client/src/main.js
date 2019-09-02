import Recorder from "./recorder";
import Client from "./client";
import { onLoad, onClickMicCapture, onClickRecStart } from "./handlers";

(async () => {
  const recorder = new Recorder("http://localhost:2345");
  const client = new Client(recorder);

  const state = {
    track: null, // MediaStreamTrack to record
    client
  };

  const els = {
    $micCapture: document.querySelector("[data-mic-capture]"),
    $micAudio: document.querySelector("[data-mic-audio]"),
    $recStart: document.querySelectorAll("[data-rec-start]")
  };

  // attach handlers
  els.$micCapture.onclick = () => onClickMicCapture(state, els);
  els.$recStart.forEach($el => {
    const tNum = $el.dataset.tnum | 0;
    const pNum = $el.dataset.pnum | 0;
    $el.onclick = () => onClickRecStart(state, els, { tNum, pNum });
  });

  onLoad(state, els);
})();
