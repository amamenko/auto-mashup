const AudioContext = require("web-audio-api").AudioContext;
const audioCtx = new AudioContext();
const fs = require("fs");
const path = require("path");
const checkFileExists = require("../utils/checkFileExists");
const { logger } = require("../../logger/logger");
const Lame = require("node-lame").Lame;
require("dotenv").config();

const getBeatPositions = async (
  essentia,
  successCallback,
  videoID,
  matchDuration,
  matchExpected,
  matchArr,
  trackDataJSON
) => {
  const accompanimentExists = await checkFileExists(
    path.resolve("output/YouTubeAudio", "accompaniment.mp3")
  );

  const cleanUpOutputDir = async () => {
    if (await checkFileExists(path.resolve("output"))) {
      fs.rmSync(path.resolve("output"), {
        recursive: true,
        force: true,
      });

      const outputDeletedStatement = "Deleted output directory!";

      if (process.env.NODE_ENV === "production") {
        logger("server").info(outputDeletedStatement);
      } else {
        console.log(outputDeletedStatement);
      }
    }

    if (await checkFileExists("YouTubeAudio.mp3")) {
      fs.rmSync(path.resolve("YouTubeAudio.mp3"), {
        recursive: true,
        force: true,
      });

      const localFileDeletedStatement = "Deleted local YouTube audio MP3 file!";

      if (process.env.NODE_ENV === "production") {
        logger("server").info(localFileDeletedStatement);
      } else {
        console.log(localFileDeletedStatement);
      }
    }
  };

  if (accompanimentExists) {
    // Lame encoding necessary due to 'Huffman data overrun' issue otherwise due to Spleeter FFMPEG concatenation
    const encoder = new Lame({
      output: "buffer",
      bitrate: 192,
    }).setFile(path.resolve("output/YouTubeAudio", "accompaniment.mp3"));

    encoder
      .encode()
      .then(async () => {
        // Encoding finished
        const audioBuffer = encoder.getBuffer();

        if (audioBuffer) {
          return await audioCtx.decodeAudioData(
            audioBuffer,
            (buffer) =>
              successCallback(
                essentia,
                buffer,
                videoID,
                matchDuration,
                matchExpected,
                matchArr,
                trackDataJSON
              ),
            (err) => {
              if (process.env.NODE_ENV === "production") {
                logger("server").error(
                  `Error with decoding audio data: ${err}`
                );
              } else {
                console.error("Error with decoding audio data " + err);
              }
            }
          );
        } else {
          cleanUpOutputDir();

          const badAudioBufferStatement =
            "Audio buffer cannot be read for beat position decoding with Essentia. Moving on to next track!";

          if (process.env.NODE_ENV === "production") {
            logger("server").info(badAudioBufferStatement);
          } else {
            console.log(badAudioBufferStatement);
          }
          return;
        }
      })
      .catch((err) => {
        cleanUpOutputDir();

        if (process.env.NODE_ENV === "production") {
          logger("server").error(
            `Something went wrong when getting audio buffer with Lame encoder: ${err}`
          );
        } else {
          console.error(err);
        }
        return;
      });
  } else {
    const noMP3Statement =
      "No local accompaniment MP3 file was found. Cannot get beat positions. Moving on to next track!";

    if (process.env.NODE_ENV === "production") {
      logger("server").info(noMP3Statement);
    } else {
      console.log(noMP3Statement);
    }

    cleanUpOutputDir();
    return;
  }
};

module.exports = getBeatPositions;
