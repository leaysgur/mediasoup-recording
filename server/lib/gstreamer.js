const { exec } = require("child_process");

module.exports = (port, pt, dest) => {
  console.log(`record rtp:${port} => ${dest}`);

  const cmd = "gst-launch-1.0";
  // debug: echo back
  // const opts = `rtpbin name=rtpbin udpsrc port=${port} caps="application/x-rtp,media=audio,clock-rate=48000,encoding-name=OPUS,payload=${pt}" ! rtpbin.recv_rtp_sink_0 rtpbin. ! rtpopusdepay ! opusdec ! autoaudiosink`;

  // debug: save wav
  // const opts = `rtpbin name=rtpbin udpsrc port=${port} caps="application/x-rtp,media=audio,clock-rate=48000,encoding-name=OPUS,payload=${pt}" ! rtpbin.recv_rtp_sink_0 rtpbin. ! rtpopusdepay ! opusdec ! wavenc ! filesink location=${dest}`;

  // TODO: wanna save ogg but how...??
  const opts = `rtpbin name=rtpbin udpsrc port=${port} caps="application/x-rtp,media=audio,clock-rate=48000,encoding-name=OPUS,payload=${pt}" ! rtpbin.recv_rtp_sink_0 rtpbin. ! rtpopusdepay ! opusdec ! wavenc ! filesink location=${dest}`;

  return exec(`${cmd} ${opts}`);
};
