const fs = require("fs");
const axios = require("axios");
const wget = require("wget-improved");
const { logger } = require("../logger/initializeLogger");
const checkFileExists = require("../utils/checkFileExists");
const { trimInputAudio } = require("./trimInputAudio");
const { splitAudioIntoStems } = require("./splitAudioIntoStems");
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

  // Download 128kbps MP3 file
  const mp3Link = await axios
    .get(`https://www.yt-download.org/api/button/mp3/${videoID}`)
    .then((res) => res.data)
    .then((data) => {
      if (data) {
        if (data.split('<a href="')[4]) {
          return data.split('<a href="')[4].split('" class="shadow-xl')[0];
        }
      }
      return "";
    })
    .catch((err) => {
      if (process.env.NODE_ENV === "production") {
        logger.error(
          `Something went wrong when accessing yt-download.org with video ID "${videoID}"`,
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

  const filePath =
    matchDuration <= 240 ? "YouTubeAudio.mp3" : "YouTubeAudioInitial.mp3";

  if (mp3Link) {
    const start = Date.now();

    const download = wget.download(mp3Link, filePath);

    download.on("error", (err) => {
      const errorStatement =
        "Received an error when attempting to download YouTube video audio. Terminating process. Output: ";

      if (process.env.NODE_ENV === "production") {
        logger.error(errorStatement, {
          indexMeta: true,
          meta: {
            message: err.message,
          },
        });
      } else {
        console.error(errorStatement + err);
      }
      return;
    });

    download.on("end", async () => {
      const doneTimestampStatement = `\nDone in ${
        (Date.now() - start) / 1000
      }s\nSaved to ${filePath}.`;

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
    });
  } else {
    const noDataStatement = "No download video data was received!";

    if (process.env.NODE_ENV === "production") {
      logger.log(noDataStatement);
    } else {
      console.log(noDataStatement);
    }

    if (await checkFileExists(filePath)) {
      fs.rmSync(filePath, {
        recursive: true,
        force: true,
      });
    }
    return;
  }
};

module.exports = getAudioInputSource;
