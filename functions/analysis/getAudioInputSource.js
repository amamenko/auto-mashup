const fs = require("fs");
const { logger } = require("../logger/initializeLogger");
const checkFileExists = require("../utils/checkFileExists");
const { trimInputAudio } = require("./trimInputAudio");
const { splitAudioIntoStems } = require("./splitAudioIntoStems");
const { installPythonLibrary } = require("../utils/installPythonLibrary");
const { runPythonFile } = require("../utils/runPythonFile");
require("dotenv").config();

const getAudioInputSource = async (
  audioStart,
  videoID,
  matchTitle,
  matchDuration,
  matchExpected,
  matchArr,
  trackDataJSON
) => {
  const downloadingStatement = `Now downloading video: ${matchTitle}`;
  if (process.env.NODE_ENV === "production") {
    logger.log(downloadingStatement);
  } else {
    console.log(downloadingStatement);
  }

  const fileName =
    matchDuration <= 240 ? "YouTubeAudio" : "YouTubeAudioInitial";
  const filePath = `${fileName}.mp3`;

  const getYouTubeAudio = async () => {
    return await installPythonLibrary("yt-dlp.py")
      .then(async () => {
        return await runPythonFile({
          fileName: "yt-dlp.py",
          arg1: `https://www.youtube.com/watch?v=${videoID}`,
          arg2: `${fileName}.%(ext)s`,
        }).catch((err) => {
          if (process.env.NODE_ENV === "production") {
            logger.error(
              `Received error when download audio for YouTube video with ID ${videoID}.`,
              {
                indexMeta: true,
                meta: {
                  message: err.message,
                },
              }
            );
          } else {
            console.error(err);
          }
        });
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "production") {
          logger.error("Received error when installing yt-dlp.", {
            indexMeta: true,
            meta: {
              message: err.message,
            },
          });
        } else {
          console.error(err);
        }
      });
  };

  const start = Date.now();

  await getYouTubeAudio()
    .then(async () => {
      const doneTimestampStatement = `The input audio source was successfully saved to ${filePath}. The process took ${
        (Date.now() - start) / 1000
      } seconds.`;

      if (process.env.NODE_ENV === "production") {
        logger.log(doneTimestampStatement);
      } else {
        console.log(doneTimestampStatement);
      }

      if (matchDuration <= 240) {
        try {
          splitAudioIntoStems(
            videoID,
            matchDuration,
            matchExpected,
            matchArr,
            trackDataJSON
          );
        } catch (err) {
          const errorLog =
            "Something went wrong with the song splitting function in splitAudioStems.js! Moving on to next song.";

          if (await checkFileExists(filePath)) {
            fs.rmSync(filePath, {
              recursive: true,
              force: true,
            });
          }

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
      } else {
        trimInputAudio(
          audioStart,
          videoID,
          matchDuration,
          matchExpected,
          matchArr,
          trackDataJSON
        );
      }
    })
    .catch((err) => {
      if (process.env.NODE_ENV === "production") {
        logger.error(
          `Received error when getting YouTube audio for video ID ${videoID}.`,
          {
            indexMeta: true,
            meta: {
              message: err.message,
            },
          }
        );
      } else {
        console.error(err);
      }
    });
};

module.exports = getAudioInputSource;
