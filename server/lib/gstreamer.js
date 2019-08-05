const { spawn } = require("child_process");

module.exports = (port, dest) => {
  console.log(`rtp:${port} => ${dest}`);

  const cmd = "gst-launch-1.0";
  // const opts = [
  //   "rtpbin",
  //   "name=rtpbin",
  //   "udpsrc",
  //   "name=audioRTP",
  //   `port=${port}`,
  //   `caps="application/x-rtp,`,
  //   "media=audio,",
  //   "clock-rate=48000,",
  //   "encoding-name=X-GST-OPUS-DRAFT-SPITTKA-00,",
  //   `payload=96"`,
  //   "!",
  //   "rtpbin.recv_rtp_sink_0 rtpbin.",
  //   "!",
  //   "rtpopusdepay",
  //   "!",
  //   "oggmux",
  //   "!",
  //   "filesink",
  //   `location=${dest}`,
  //   "sync=false",
  //   "async=false"
  // ];
  const opts = ["audiotestsrc", "!", "autoaudiosink"];

  const ps = spawn(cmd, opts);
  ps.stdout.on("data", data => {
    console.log(`stdout: ${data}`);
  });
  ps.stderr.on("data", data => {
    console.log(`stderr: ${data}`);
  });
  ps.on("close", code => {
    console.log(`child process exited with code ${code}`);
  });

  return ps;
};
