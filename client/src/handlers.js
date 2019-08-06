export const onLoad = async (
  state,
  { $micMute, $micUnmute, $recStart, $recStop },
  { logger }
) => {
  logger.log("loaded");

  $micMute.disabled = $micUnmute.disabled = $recStart.disabled = $recStop.disabled = true;
};

export const onClickMicCapture = async (
  state,
  { $micCapture, $micAudio, $micMute, $micUnmute, $recStart },
  { logger }
) => {
  logger.log("capturing mic.");

  const stream = await navigator.mediaDevices
    .getUserMedia({ audio: true })
    .catch(err => logger.error(err.toString()));

  state.track = stream.getTracks()[0];
  $micCapture.disabled = true;
  $recStart.disabled = false;

  $micMute.disabled = state.muted;
  $micUnmute.disabled = !state.muted;

  $micAudio.srcObject = new MediaStream([state.track]);

  logger.log("captured!");
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

export const onClickRecStart = async (
  state,
  { $micAudio, $recStart, $recStop, $recAudio },
  { logger, client }
) => {
  logger.log("start recording");

  state.recording = true;

  $recStart.disabled = state.recording;
  $recStop.disabled = !state.recording;

  // update local track again (mediasoup-client stop() the track...)
  const stream = await navigator.mediaDevices
    .getUserMedia({ audio: true })
    .catch(err => logger.error(err.toString()));
  state.track = stream.getTracks()[0];
  $micAudio.srcObject = new MediaStream([state.track]);

  logger.log("update track again");

  const consumer = await client.start(state.track);
  $recAudio.srcObject = new MediaStream([consumer.track]);

  logger.log("now recording...");
};

export const onClickRecStop = async (
  state,
  { $recStart, $recStop, $recAudio },
  { logger, client }
) => {
  logger.log("stop recording");

  state.recording = false;

  $recStart.disabled = state.recording;
  $recStop.disabled = !state.recording;

  $recAudio.srcObject.getTracks().forEach(t => t.stop());
  $recAudio.srcObject = null;

  await client.stop();

  logger.log("stopped");
};

export const onClickStatFetch = async (_, __, { logger, client }) => {
  const res = await client
    .fetchStat()
    .catch(err => logger.error(err.toString()));
  logger.log(JSON.stringify(res, null, 2));
};
