# mediasoup-recording

> WIP

PoC for media recording w/ `mediasoup` and GStreamer.


## Dev

You need to install GStreamer beforehand.

```sh
brew install gstreamer
brew install gst-plugins-base
brew install gst-plugins-good
brew install gst-plugins-bad
```

After that, setup repos.

```
cd server
npm i

# run rest+media server on http://127.0.0.1:2345
npm run dev

cd client
npm i

# run web server on http://127.0.0.1:9000
npm run dev
```
