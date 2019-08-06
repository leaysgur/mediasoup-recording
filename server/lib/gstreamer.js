const { exec } = require("child_process");

module.exports = (port, codec, dest) => {
  const clockRate = codec.clockRate;
  const pt = codec.preferredPayloadType;

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
    `filesink location=${dest}`
  ].join(" ! ");

  console.log(`record rtp:${port} => ${dest}`);
  console.log(cmd, opts);

  return exec(`${cmd} ${opts}`);
};
