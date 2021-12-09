const fs = require("fs");
const puppeteer = require("puppeteer");
const path = require("path");
const wget = require("wget-improved");
const checkFileExists = require("../utils/checkFileExists");
const { logger } = require("../logger/initializeLogger");
const getBeatPositions = require("./getBeatPositions");
const { beatSuccessCallback } = require("./beatSuccessCallback");
const esPkg = require("essentia.js");
require("dotenv").config();
let essentia;

if (esPkg.EssentiaWASM) {
  essentia = new esPkg.Essentia(esPkg.EssentiaWASM);
}

const splitAudioIntoStems = async (
  matchID,
  matchDuration,
  matchExpected,
  matchArr,
  trackDataJSON
) => {
  const fileName = "YouTubeAudio";

  const checkIfInputExists = await checkFileExists(`${fileName}.mp3`);

  if (checkIfInputExists) {
    const startingSplitAttemptStatement =
      "Now attempting to split audio into vocal and accompaniment sections...";

    if (process.env.NODE_ENV === "production") {
      logger.log(startingSplitAttemptStatement);
    } else {
      console.log(startingSplitAttemptStatement);
    }

    const browser = await puppeteer.launch({
      args: [
        "--disable-setuid-sandbox",
        "--single-process",
        "--no-sandbox",
        "--no-zygote",
      ],
    });
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);

    page.on("requestfinished", async (request) => {
      const response = request.response();
      const resStatus = response.status();

      if (request.url() && resStatus) {
        if (resStatus) {
          const resStatusStr = resStatus.toString();

          // Make sure status code is not 4xx
          if (
            resStatusStr.length === 3 &&
            resStatusStr[0] !== "4" &&
            resStatusStr[0] !== "5"
          ) {
            if (/\.mp3$/i.test(request.url())) {
              if (request.url().includes("output")) {
                if (!fs.existsSync("output")) {
                  fs.mkdirSync(path.resolve(`output/${fileName}`), {
                    recursive: true,
                  });
                }

                const downloadViaStream = (url, section) => {
                  const filePath = `output/${fileName}/${section}.mp3`;

                  const download = wget.download(url, filePath);

                  if (download) {
                    const start = Date.now();

                    download.on("error", (err) => {
                      const errorStatement = `Received an error when attempting to wget from the URL "${url}"`;

                      if (process.env.NODE_ENV === "production") {
                        logger.error(errorStatement, {
                          indexMeta: true,
                          meta: {
                            code: resStatusStr,
                            message: err.message,
                          },
                        });
                      } else {
                        console.error(errorStatement + err);
                        console.error(`Received status code ${resStatusStr}.`);
                      }

                      return;
                    });

                    download.on("progress", async (progress) => {
                      const timeElapsed = (Date.now() - start) / 1000;

                      // Bail out of download if it takes longer than a minute
                      if (timeElapsed >= 60) {
                        if (download.req) {
                          download.req.abort();

                          const abortStatement = `Aborted wget download from the URL "${url}". Download took more than a minute!`;

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
                        doneTimestampStatement = `Saved the ${section} section to ${filePath}. The process took ${
                          (Date.now() - start) / 1000
                        } seconds.`;
                      } else {
                        doneTimestampStatement = `The downloading process of ${section} section to ${filePath} was aborted. The process took ${
                          (Date.now() - start) / 1000
                        } seconds.`;
                      }

                      if (process.env.NODE_ENV === "production") {
                        logger.log(doneTimestampStatement);
                      } else {
                        console.log(doneTimestampStatement);
                      }
                    });
                  }
                };

                const vocalsExist = await checkFileExists(
                  path.resolve(`output/${fileName}/vocals.mp3`)
                );

                const accompanimentExists = await checkFileExists(
                  path.resolve(`output/${fileName}/accompaniment.mp3`)
                );

                if (request.url().includes("vocals")) {
                  if (!vocalsExist) {
                    downloadViaStream(request.url(), "vocals");
                  }

                  if (!accompanimentExists) {
                    downloadViaStream(
                      request.url().replace("vocals", "accompaniment"),
                      "accompaniment"
                    );
                  }
                }

                if (request.url().includes("accompaniment")) {
                  if (!accompanimentExists) {
                    downloadViaStream(request.url(), "accompaniment");
                  }

                  if (!vocalsExist) {
                    downloadViaStream(
                      request.url().replace("accompaniment", "vocals"),
                      "vocals"
                    );
                  }
                }
              }
            }
          }
        }
      }
    });

    await page.goto(process.env.SONG_SPLITTING_SOURCE, {
      waitUntil: "networkidle2",
    });

    const uploadEl = await page.$("input[type=file]");
    await uploadEl.uploadFile(`${fileName}.mp3`);
    await page.waitForTimeout(5000);

    await page.evaluate(() => {
      const submitEl = document.querySelector("input[id=formSubmit]");

      if (submitEl) {
        submitEl.click();
      }
    });

    // Wait 2 minutes for split to finish
    await page.waitForTimeout(120000);

    // Try clicking on media playback elements
    await page.evaluate(() => {
      const playerEl = document.querySelector(
        "vm-player[id=playerAccompaniment][ready]"
      );

      if (playerEl) {
        playerEl.play();
      }
    });

    // Wait another 5 seconds
    await page.waitForTimeout(5000);

    await browser.close();

    if (fs.existsSync(`${fileName}.mp3`)) {
      fs.unlinkSync(`${fileName}.mp3`);
    }

    const checkIfVocalsSplitSuccessfully = await checkFileExists(
      path.resolve(`output/${fileName}/vocals.mp3`)
    );

    const checkIfAccompanimentSplitSuccessfully = await checkFileExists(
      path.resolve(`output/${fileName}/accompaniment.mp3`)
    );

    if (
      checkIfVocalsSplitSuccessfully &&
      checkIfAccompanimentSplitSuccessfully
    ) {
      const successStatement = "Successfully split track into two stems!";

      if (process.env.NODE_ENV === "production") {
        logger.log(successStatement);
      } else {
        console.log(successStatement);
      }

      try {
        return getBeatPositions(
          essentia,
          beatSuccessCallback,
          matchID,
          matchDuration,
          matchExpected,
          matchArr,
          trackDataJSON
        );
      } catch (err) {
        if (process.env.NODE_ENV === "production") {
          logger.error(
            "Error getting beat positions within 'splitAudioIntoStems.js' function!",
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
        return;
      }
    } else {
      const unsuccessfulSplitStatement =
        "Either vocals or accompaniment did not get split successfully. Cannot get beat positions. Moving on to next song!";

      if (process.env.NODE_ENV === "production") {
        logger.log(unsuccessfulSplitStatement);
      } else {
        console.log(unsuccessfulSplitStatement);
      }

      const outputDirectoryExists = await checkFileExists(
        path.resolve("output")
      );

      if (outputDirectoryExists) {
        fs.rmSync(path.resolve("output"), {
          recursive: true,
          force: true,
        });
      }

      return;
    }
  } else {
    const noExistStatement = `${fileName}.mp3 input audio file does not exist! Moving on to next song.`;

    if (process.env.NODE_ENV === "production") {
      logger.log(noExistStatement);
    } else {
      console.log(noExistStatement);
    }

    return;
  }
};

module.exports = { splitAudioIntoStems };
