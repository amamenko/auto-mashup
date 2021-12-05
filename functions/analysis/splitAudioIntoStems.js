const fs = require("fs");
const puppeteer = require("puppeteer");
const path = require("path");
const axios = require("axios");
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
  const browser = await puppeteer.launch({
    args: ["--disable-setuid-sandbox", "--no-sandbox"],
  });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    if (request.url()) {
      if (/\.mp3$/i.test(request.url())) {
        if (request.url().includes("output")) {
          if (!fs.existsSync("output")) {
            fs.mkdirSync(path.resolve(`output/${fileName}`), {
              recursive: true,
            });
          }

          const vocalsExist = await checkFileExists(
            path.resolve(`output/${fileName}/vocals.mp3`)
          );

          const accompanimentExists = await checkFileExists(
            path.resolve(`output/${fileName}/accompaniment.mp3`)
          );

          const downloadViaStream = async (url, section) => {
            const downloadStream = await axios({
              url,
              method: "GET",
              responseType: "stream",
            }).catch((err) => err);

            if (downloadStream) {
              const filePath = path.resolve(
                `output/${fileName}/${section}.mp3`
              );

              const writer = fs.createWriteStream(filePath);

              downloadStream.data.pipe(writer);

              downloadStream.data.on("error", (err) => {
                const errorStatement = `Received an error when attempting to download from the URL "${url}"`;

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

              downloadStream.data.on("end", () => {
                const doneStatement = `Saved the ${section} section to ${filePath}.`;

                if (process.env.NODE_ENV === "production") {
                  logger.log(doneStatement);
                } else {
                  console.log(doneStatement);
                }
              });
            }
          };

          if (request.url().includes("vocals")) {
            if (!vocalsExist) {
              downloadViaStream(request.url(), "vocals");
            }
          }

          if (request.url().includes("accompaniment")) {
            if (!accompanimentExists) {
              downloadViaStream(request.url(), "accompaniment");
            }
          }
        }
      }
    }
    request.continue();
  });

  await page.goto(process.env.SONG_SPLITTING_SOURCE, {
    waitUntil: "networkidle2",
  });

  const uploadEl = await page.$("input[type=file]");
  await uploadEl.uploadFile(`${fileName}.mp3`);
  await page.waitForTimeout(5000);
  await page.evaluate(() => {
    document.querySelector("input[id=formSubmit]").click();
  });
  // Wait 2 minutes before closing just in case
  await page.waitForTimeout(120000);

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

  if (checkIfVocalsSplitSuccessfully && checkIfAccompanimentSplitSuccessfully) {
    const successStatement = "Successfully split track into two stems";

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

    const outputDirectoryExists = await checkFileExists(path.resolve("output"));

    if (outputDirectoryExists) {
      fs.rmSync(path.resolve("output"), {
        recursive: true,
        force: true,
      });
    }

    return;
  }
};

module.exports = { splitAudioIntoStems };
