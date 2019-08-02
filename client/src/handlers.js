export const onLoad = (
  _,
  { $micMute, $micUnmute, $roomJoin, $roomLeave, $recStart, $recStop },
  logger
) => {
  logger.log("loaded");
  $micMute.disabled = $micUnmute.disabled = $roomJoin.disabled = $roomLeave.disabled = $recStart.disabled = $recStop.disabled = true;
};

export const onClickMicCapture = async (
  state,
  { $micCapture, $micMute, $micUnmute, $roomJoin },
  logger
) => {
  logger.log("capture mic.");

  const stream = await navigator.mediaDevices
    .getUserMedia({ audio: true })
    .catch(err => logger.error(err.toString()));

  state.track = stream.getTracks()[0];
  $micCapture.disabled = true;
  $roomJoin.disabled = false;

  $micMute.disabled = state.muted;
  $micUnmute.disabled = !state.muted;
};

export const onClickMicMute = (state, { $micMute, $micUnmute }, logger) => {
  logger.log(`muted`);

  state.muted = true;

  state.track.enabled = !state.muted;
  $micMute.disabled = state.muted;
  $micUnmute.disabled = !state.muted;
};

export const onClickMicUnmute = (state, { $micMute, $micUnmute }, logger) => {
  logger.log(`unmuted`);

  state.muted = false;

  state.track.enabled = !state.muted;
  $micMute.disabled = state.muted;
  $micUnmute.disabled = !state.muted;
};

export const onClickRoomJoin = async (
  state,
  { $roomJoin, $roomLeave, $recStart },
  logger
) => {
  logger.log("join");

  try {
    await state.room.join(state.track);
  } catch (err) {
    return logger.error(err);
  }

  state.joined = true;

  $roomJoin.disabled = state.joined;
  $roomLeave.disabled = !state.joined;

  $recStart.disabled = !state.joined;
};
export const onClickRoomLeave = (
  state,
  { $roomJoin, $roomLeave, $recStart },
  logger
) => {
  logger.log("leave");

  state.joined = false;

  $roomJoin.disabled = state.joined;
  $roomLeave.disabled = !state.joined;

  $recStart.disabled = !state.joined;
};

export const onClickRecStart = (
  state,
  { $recStart, $recStop, $roomLeave },
  logger
) => {
  logger.log("start recording");

  state.recording = true;

  $recStart.disabled = state.recording;
  $recStop.disabled = !state.recording;

  $roomLeave.disabled = state.recording;
};

export const onClickRecStop = (
  state,
  { $recStart, $recStop, $roomLeave },
  logger
) => {
  logger.log("stop recording");

  state.recording = false;

  $recStart.disabled = state.recording;
  $recStop.disabled = !state.recording;

  $roomLeave.disabled = state.recording;
};
