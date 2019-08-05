const { exec } = require("child_process");

module.exports = (port, dest) => {
  console.log(`record rtp:${port} => ${dest}`);

  const cmd = "gst-launch-1.0";
  // debug: echo back
  // const opts = `rtpbin name=rtpbin udpsrc port=${port} caps="application/x-rtp,media=audio,clock-rate=48000,encoding-name=OPUS,payload=100" ! rtpbin.recv_rtp_sink_0  rtpbin. ! rtpopusdepay ! opusparse ! opusdec ! autoaudiosink`;
  const opts = `rtpbin name=rtpbin udpsrc port=${port} caps="application/x-rtp,media=audio,clock-rate=48000,encoding-name=OPUS,payload=100" ! rtpbin.recv_rtp_sink_0  rtpbin. ! rtpopusdepay ! opusparse ! opusdec ! filesink location=${dest}`;

  const ps = exec(`${cmd} ${opts}`);

  return ps;
};
