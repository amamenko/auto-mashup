const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const checkFileExists = require("../utils/checkFileExists");
const { splitAudioIntoStems } = require("./splitAudioIntoStems");
const { logger } = require("../logger/initializeLogger");
require("dotenv").config();

const trimInputAudio = async (
  audioStart,
  matchID,
  matchDuration,
  matchExpected,
  matchArr,
  trackDataJSON
) => {
  const youtubeAudioFileExists = await checkFileExists(
    "YouTubeAudioInitial.mp3"
  );
  const trimmedYouTubeAudioFileExists = await checkFileExists(
    "YouTubeAudio.mp3"
  );

  // Removed leftover trimmed audio, if any
  if (trimmedYouTubeAudioFileExists) {
    fs.rmSync("YouTubeAudio.mp3", {
      recursive: true,
      force: true,
    });
  }

  if (youtubeAudioFileExists) {
    const start = Date.now();

    ffmpeg()
      .input("YouTubeAudioInitial.mp3")
      // Cap input audio to 4 minutes
      .audioFilters(`atrim=start=${audioStart ? audioStart : 0}:duration=240`)
      .output("YouTubeAudio.mp3")
      .on("error", async (err, stdout, stderr) => {
        const errorStatement =
          "FFMPEG received an error when attempting to trim the audio input. Output: ";

        if (process.env.NODE_ENV === "production") {
          logger.error(errorStatement, {
            indexMeta: true,
            meta: {
              message: err.message,
            },
          });
        } else {
          console.error(errorStatement + err.message);
        }

        fs.rmSync("YouTubeAudioInitial.mp3", {
          recursive: true,
          force: true,
        });

        if (trimmedYouTubeAudioFileExists) {
          fs.rmSync("YouTubeAudio.mp3", {
            recursive: true,
            force: true,
          });
        }

        return;
      })
      .on("end", async () => {
        const doneStatement = `\nDone in ${
          (Date.now() - start) / 1000
        }s\nSuccessfully trimmed input track.`;

        if (process.env.NODE_ENV === "production") {
          logger.log(doneStatement);
        } else {
          console.log(doneStatement);
        }

        fs.rmSync("YouTubeAudioInitial.mp3", {
          recursive: true,
          force: true,
        });

        try {
          splitAudioIntoStems(
            matchID,
            matchDuration,
            matchExpected,
            matchArr,
            trackDataJSON
          );
        } catch (err) {
          const errorLog =
            "Something went wrong with the song splitting function in splitAudioStems.js! Moving on to next song.";

          if (process.env.NODE_ENV === "production") {
            logger.error(errorLog, {
              indexMeta: true,
              meta: {
                err,
              },
            });
          } else {
            console.error(errorLog);
            console.error(err);
          }
        }

        return;
      })
      .run();
  } else {
    const doesntExistStatement =
      "YouTube audio input doesn't exist. Moving on to next song!";

    if (process.env.NODE_ENV === "production") {
      logger.log(doesntExistStatement);
    } else {
      console.log(doesntExistStatement);
    }

    return;
  }
};

module.exports = { trimInputAudio };
