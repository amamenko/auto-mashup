const fs = require("fs");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const wget = require("wget-improved");
const { logger } = require("../logger/initializeLogger");
const checkFileExists = require("../utils/checkFileExists");
const { trimInputAudio } = require("./trimInputAudio");
const { splitAudioIntoStems } = require("./splitAudioIntoStems");
require("dotenv").config();

puppeteer.use(StealthPlugin());

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

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--disable-setuid-sandbox",
      "--single-process",
      "--no-sandbox",
      "--no-zygote",
    ],
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(0);

  await page.goto(
    `https://320ytmp3.com/en24/download?url=${videoID}&type=ytmp3`,
    {
      waitUntil: "networkidle2",
    }
  );

  await page.waitForTimeout(5000);

  await page.evaluate(() => {
    const convertButton = document.querySelector("button[id=cvt-btn]");

    if (convertButton) {
      convertButton.click();
    }
  });

  // Wait for conversion
  await page.waitForTimeout(60000);

  // Get MP3 Link (defaults to 128 kbps)
  const mp3Link = await page
    .$eval("a[id=mp3-dl-btn]", (anchor) => anchor.getAttribute("href"))
    .catch((err) => {
      const couldntFindStatement =
        "Couldn't find HREF anchor tag on MP3 download page. Moving on to next song!";

      if (process.env.NODE_ENV === "production") {
        logger.log(couldntFindStatement);
      } else {
        console.log(couldntFindStatement);
      }
    });

  await browser.close();

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

    download.on("progress", async (progress) => {
      const timeElapsed = (Date.now() - start) / 1000;

      // Bail out of download if it takes longer than a minute
      if (timeElapsed >= 60) {
        if (download.req) {
          download.req.abort();

          const abortStatement = `Aborted wget download from the URL "${mp3Link}". Download took more than a minute!`;

          if (process.env.NODE_ENV === "production") {
            logger.log(abortStatement);
          } else {
            console.log(abortStatement);
          }

          if (await checkFileExists(filePath)) {
            fs.rmSync(filePath, {
              recursive: true,
              force: true,
            });
          }
        }
      }
    });

    download.on("end", async () => {
      let doneTimestampStatement = "";

      if (await checkFileExists(filePath)) {
        doneTimestampStatement = `The input audio source was successfully saved to ${filePath}. The process took ${
          (Date.now() - start) / 1000
        } seconds.`;
      } else {
        doneTimestampStatement = `The downloading process of audio to ${filePath} was aborted. The process took ${
          (Date.now() - start) / 1000
        } seconds.`;
      }

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
