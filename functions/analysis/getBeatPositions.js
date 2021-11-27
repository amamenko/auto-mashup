const AudioContext = require("web-audio-api").AudioContext;
const audioCtx = new AudioContext();
const fs = require("fs");
const path = require("path");
const checkFileExists = require("../utils/checkFileExists");
const { logger } = require("../logger/initializeLogger");
require("dotenv").config();

const getBeatPositions = async (successCallback) => {
  const accompanimentExists = await checkFileExists(
    path.resolve("output/YouTubeAudio", "accompaniment.mp3")
  );

  if (accompanimentExists) {
    const audioBuffer = fs.readFileSync(
      path.resolve("output/YouTubeAudio", "accompaniment.mp3")
    );

    if (audioBuffer) {
      return await audioCtx.decodeAudioData(
        audioBuffer,
        successCallback,
        (err) => {
          if (process.env.NODE_ENV === "production") {
            logger.error("Error with decoding audio data", {
              indexMeta: true,
              meta: {
                message: err.err,
              },
            });
          } else {
            console.error("Error with decoding audio data" + err.err);
          }
        }
      );
    } else {
      const badAudioBufferStatement =
        "Audio buffer cannot be read for beat position decoding with Essentia. Moving on to next track!";

      if (process.env.NODE_ENV === "production") {
        logger.log(badAudioBufferStatement);
      } else {
        console.log(badAudioBufferStatement);
      }
      return;
    }
  } else {
    const noMP3Statement =
      "No local accompaniment MP3 file was found. Cannot get beat positions. Moving on to next track!";

    if (process.env.NODE_ENV === "production") {
      logger.log(noMP3Statement);
    } else {
      console.log(noMP3Statement);
    }

    const cleanUpOutputDir = async () => {
      if (await checkFileExists(path.resolve("output"))) {
        fs.rmSync(path.resolve("output"), {
          recursive: true,
          force: true,
        });

        const outputDeletedStatement = "Deleted output directory!";

        if (process.env.NODE_ENV === "production") {
          logger.log(outputDeletedStatement);
        } else {
          console.log(outputDeletedStatement);
        }
      }
    };

    cleanUpOutputDir();
    return;
  }
};

module.exports = getBeatPositions;
