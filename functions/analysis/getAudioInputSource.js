const fs = require("fs");
const axios = require("axios");
const checkFileExists = require("../utils/checkFileExists");
const { logger } = require("../logger/initializeLogger");
const { trimInputAudio } = require("./trimInputAudio");
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

  const mp3Link = await axios
    .get(`https://www.yt-download.org/api/button/mp3/${videoID}`)
    .then((res) => res.data)
    .then((data) =>
      data ? data.split('<a href="')[1].split('" class="shadow-xl')[0] : ""
    )
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

  const start = Date.now();

  const filePath = "YouTubeAudioInitial.mp3";

  const writer = fs.createWriteStream(filePath);

  const youtubeAudioFileExists = await checkFileExists(
    "YouTubeAudioInitial.mp3"
  );

  const response = await axios({
    url: mp3Link ? mp3Link : "",
    method: "GET",
    responseType: "stream",
  }).catch(async (err) => {
    if (process.env.NODE_ENV === "production") {
      logger.error(
        `Something went wrong when performing a GET request to the URL "${mp3Link}"`,
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

    if (youtubeAudioFileExists) {
      fs.rmSync("YouTubeAudioInitial.mp3", {
        recursive: true,
        force: true,
      });
    }
  });

  if (response) {
    response.data.pipe(writer);

    response.data.on("error", (err) => {
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

    response.data.on("end", () => {
      const doneTimestampStatement = `\nDone in ${
        (Date.now() - start) / 1000
      }s\nSaved to ${filePath}.`;

      if (process.env.NODE_ENV === "production") {
        logger.log(doneTimestampStatement);
      } else {
        console.log(doneTimestampStatement);
      }

      trimInputAudio(
        audioStart,
        videoID,
        matchDuration,
        matchExpected,
        matchArr,
        trackDataJSON
      );
    });
  } else {
    const noDataStatement = "No download video data was received!";

    if (process.env.NODE_ENV === "production") {
      logger.log(noDataStatement);
    } else {
      console.log(noDataStatement);
    }

    if (youtubeAudioFileExists) {
      fs.rmSync("YouTubeAudioInitial.mp3", {
        recursive: true,
        force: true,
      });
    }
    return;
  }
};

module.exports = getAudioInputSource;
