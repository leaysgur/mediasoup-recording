const onClickMicCapture = async (
  state,
  { $micCapture, $micMute, $micUnmute },
  logger
) => {
  logger.log("capture mic.");

  const stream = await navigator.mediaDevices
    .getUserMedia({ audio: true })
    .catch(err => logger.error(err.toString()));

  state.track = stream.getTracks()[0];
  $micCapture.disabled = true;

  $micMute.disabled = state.muted;
  $micUnmute.disabled = !state.muted;
};

const onClickMicMute = (state, { $micMute, $micUnmute }, logger) => {
  logger.log(`Mic. muted`);

  state.muted = true;

  state.track.enabled = !state.muted;
  $micMute.disabled = state.muted;
  $micUnmute.disabled = !state.muted;
};
const onClickMicUnmute = (state, { $micMute, $micUnmute }, logger) => {
  logger.log(`Mic. unmuted`);

  state.muted = false;

  state.track.enabled = !state.muted;
  $micMute.disabled = state.muted;
  $micUnmute.disabled = !state.muted;
};

(async () => {
  const state = {
    track: null, // MediaStreamTrack to record
    muted: false // track is enabled or NOT
  };

  const $els = {
    $micCapture: document.getElementById("mic-capture"),
    $micMute: document.getElementById("mic-mute"),
    $micUnmute: document.getElementById("mic-unmute"),
    $recStart: document.getElementById("rec-start"),
    $recStop: document.getElementById("rec-stop"),
    $evLogs: document.getElementById("ev-logs")
  };

  const logger = {
    log(data) {
      console.log(data);
      $els.$evLogs.textContent += `${data}\n`;
    },
    error(err) {
      console.error(err);
    }
  };

  $els.$micMute.disabled = $els.$micUnmute.disabled = $els.$recStart.disabled = $els.$recStop.disabled = true;

  $els.$micCapture.onclick = () => onClickMicCapture(state, $els, logger);
  $els.$micMute.onclick = () => onClickMicMute(state, $els, logger);
  $els.$micUnmute.onclick = () => onClickMicUnmute(state, $els, logger);
})();
