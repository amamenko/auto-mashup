const AudioContext = require("web-audio-api").AudioContext;
const audioCtx = new AudioContext();
const fs = require("fs");
const path = require("path");

const getBeatPositions = async (successCallback) => {
  const audioBuffer = fs.readFileSync(
    path.resolve("output/YouTubeAudio", "accompaniment.wav")
  );

  await audioCtx.decodeAudioData(audioBuffer, successCallback, (e) =>
    console.log("Error with decoding audio data" + e.err)
  );
};

module.exports = getBeatPositions;
