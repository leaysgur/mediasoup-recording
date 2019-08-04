export const onLoad = async (
  state,
  { $micMute, $micUnmute, $recStart, $recStop },
  { logger, client }
) => {
  logger.log("loaded");
  $micMute.disabled = $micUnmute.disabled = $recStart.disabled = $recStop.disabled = true;
  await client.setup();
};

export const onClickMicCapture = async (
  state,
  { $micCapture, $micMute, $micUnmute, $recStart },
  { logger }
) => {
  logger.log("capture mic.");

  const stream = await navigator.mediaDevices
    .getUserMedia({ audio: true })
    .catch(err => logger.error(err.toString()));

  state.track = stream.getTracks()[0];
  $micCapture.disabled = true;
  $recStart.disabled = false;

  $micMute.disabled = state.muted;
  $micUnmute.disabled = !state.muted;
};

export const onClickMicMute = (state, { $micMute, $micUnmute }, { logger }) => {
  logger.log(`muted`);

  state.muted = true;

  state.track.enabled = !state.muted;
  $micMute.disabled = state.muted;
  $micUnmute.disabled = !state.muted;
};

export const onClickMicUnmute = (
  state,
  { $micMute, $micUnmute },
  { logger }
) => {
  logger.log(`unmuted`);

  state.muted = false;

  state.track.enabled = !state.muted;
  $micMute.disabled = state.muted;
  $micUnmute.disabled = !state.muted;
};

export const onClickRecStart = (state, { $recStart, $recStop }, { logger }) => {
  logger.log("start recording");

  state.recording = true;

  $recStart.disabled = state.recording;
  $recStop.disabled = !state.recording;
};

export const onClickRecStop = (state, { $recStart, $recStop }, { logger }) => {
  logger.log("stop recording");

  state.recording = false;

  $recStart.disabled = state.recording;
  $recStop.disabled = !state.recording;
};
