const AudioContext = require("web-audio-api").AudioContext;
const audioCtx = new AudioContext();
const fs = require("fs");
const path = require("path");

const getBeatPositions = async (successCallback) => {
  const audioBuffer = fs.readFileSync(
    path.resolve("output/YouTubeAudio", "accompaniment.mp3")
  );

  if (audioBuffer) {
    return await audioCtx.decodeAudioData(audioBuffer, successCallback, (e) =>
      console.log("Error with decoding audio data" + e.err)
    );
  } else {
    console.log(
      "Audio buffer cannot be read for beat position decoding with Essentia. Moving on to next track!"
    );
    return;
  }
};

module.exports = getBeatPositions;
