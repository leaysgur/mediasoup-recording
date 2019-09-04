const { exec } = require("child_process");

module.exports = (port, codec, sinkSettings, dest) => {
  const clockRate = codec.clockRate;
  const pt = codec.preferredPayloadType;

  let sinkArgs = `location=${dest}`;
  if (sinkSettings) {
    sinkArgs += ` buffer-mode=${sinkSettings.bufferMode}`;
    sinkArgs += ` buffer-size=${sinkSettings.bufferSize}`;
    sinkArgs += ` blocksize=${sinkSettings.blocksize}`;
  }

  const cmd = "gst-launch-1.0";
  const opts = [
    `rtpbin name=rtpbin udpsrc port=${port} caps="application/x-rtp,media=audio,clock-rate=${clockRate},encoding-name=OPUS,payload=${pt}"`,
    "rtpbin.recv_rtp_sink_0 rtpbin.",
    "rtpopusdepay",
    // debug: echo back
    // "opusdec",
    // "autoaudiosink"
    "opusparse",
    "oggmux",
    `filesink ${sinkArgs}`
  ].join(" ! ");

  console.log(`record rtp:${port} => ${dest}`);
  console.log(cmd, opts);

  return exec(`${cmd} ${opts}`);
};
