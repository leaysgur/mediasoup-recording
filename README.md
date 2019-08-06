# mediasoup-recording

PoC for media recording w/ `mediasoup` and GStreamer.

## Feat

- send single audio track from client
  - opus audio only
- return consumer back for local preview
- create rtpTransport and consumer on server
- spawn `gst-launch-1.0` and record it into `.ogg`

## Dev

You need to install GStreamer beforehand.

```sh
# macOS
brew install gstreamer
brew install gst-plugins-base
brew install gst-plugins-good
brew install gst-plugins-bad
```

After that, setup repos.

```sh
cd server
npm i

# create directry for recorded files and specify it in config.js

# run rest+media server on http://127.0.0.1:2345
npm run dev

cd client
npm i

# run web server on http://127.0.0.1:9000
npm run dev
```
