const AudioContext = require("web-audio-api").AudioContext;
const audioCtx = new AudioContext();
const fs = require("fs");
const path = require("path");
const checkFileExists = require("../utils/checkFileExists");

const getBeatPositions = async (successCallback) => {
  const accompanimentExists = await checkFileExists(
    path.resolve("output/YouTubeAudio", "accompaniment.mp3")
  );

  if (accompanimentExists) {
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
  } else {
    console.log(
      "No local accompaniment MP3 file was found. Cannot get beat positions. Moving on to next track!"
    );

    const cleanUpOutputDir = async () => {
      if (await checkFileExists(path.resolve("output"))) {
        fs.rmSync(path.resolve("output"), {
          recursive: true,
          force: true,
        });
        console.log("Deleted output directory!");
      }
    };

    cleanUpOutputDir();
    return;
  }
};

module.exports = getBeatPositions;
