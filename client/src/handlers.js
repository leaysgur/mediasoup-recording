export const onLoad = async (state, { $recStart }) => {
  console.log("loaded");

  $recStart.forEach($el => ($el.disabled = true));
};

export const onClickMicCapture = async (
  state,
  { $micCapture, $micAudio, $recStart }
) => {
  console.log("capturing mic.");

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  $micAudio.srcObject = stream;

  state.track = stream.getTracks()[0];
  $micCapture.disabled = true;
  $recStart.forEach($el => ($el.disabled = false));

  console.log("captured!");
};

export const onClickRecStart = async (state, _, { tNum, pNum }) => {
  console.log(`add ${tNum} transports w/ ${pNum} producers`);
  const { client, track } = state;

  await client.start(track, { tNum, pNum });

  const { transport, producer } = client.counter;
  console.log(`Total: ${transport} transport(s) + ${producer} producer(s)`);
};
