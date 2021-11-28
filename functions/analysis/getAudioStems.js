const fs = require("fs");
const axios = require("axios");
const { PythonShell } = require("python-shell");
const getBeatPositions = require("./getBeatPositions");
const esPkg = require("essentia.js");
const checkFileExists = require("../utils/checkFileExists");
const { logger } = require("../logger/initializeLogger");
const exec = require("child_process").exec;
const { beatSuccessCallback } = require("./beatSuccessCallback");
require("dotenv").config();
let essentia;

if (esPkg.EssentiaWASM) {
  essentia = new esPkg.Essentia(esPkg.EssentiaWASM);
}

const getAudioStems = async (
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

  const filePath = "YouTubeAudio.mp3";

  const writer = fs.createWriteStream(filePath);

  const youtubeAudioFileExists = await checkFileExists("YouTubeAudio.mp3");

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
      fs.rmSync("YouTubeAudio.mp3", {
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

      // Make sure Spleeter is installed
      PythonShell.run(
        "./python_scripts/install_package.py",
        { args: ["spleeter"] },
        (err) => {
          if (err) {
            throw err;
          } else {
            // Split audio into stems and clean up
            const spleeterScript = exec(
              `bash spleeter-wrapper.sh -f ${filePath} --stems 2 --process_codec MP3`
            );

            spleeterScript.on("spawn", () => {
              const splittingStatement = "Splitting audio file.";

              if (process.env.NODE_ENV === "production") {
                logger.log(splittingStatement);
              } else {
                console.log(splittingStatement);
              }
            });

            spleeterScript.on("error", (err) => {
              const errorStatement =
                "Error received when splitting audio file!";

              if (process.env.NODE_ENV === "production") {
                logger.error(errorStatement, {
                  indexMeta: true,
                  meta: {
                    err,
                  },
                });
              } else {
                console.error(errorStatement);
              }
            });

            spleeterScript.on("exit", (code) => {
              if (fs.existsSync("pretrained_models")) {
                fs.rmSync("pretrained_models", { recursive: true });
                const removedStatement =
                  "Removed pretrained_models directory and local audio file";

                if (process.env.NODE_ENV === "production") {
                  logger.log(removedStatement);
                } else {
                  console.log(removedStatement);
                }
              }

              if (code !== 0) {
                if (process.env.NODE_ENV === "production") {
                  logger.error(
                    "Received error when attempting to split MP3 audio with Spleeter bash command!",
                    {
                      indexMeta: true,
                      meta: {
                        code: code,
                      },
                    }
                  );
                } else {
                  console.error(
                    `Received error code ${code} when attempting to split MP3 audio with Spleeter bash command!`
                  );
                }
              } else {
                const successStatement =
                  "Successfully split track into two stems";

                if (process.env.NODE_ENV === "production") {
                  logger.log(successStatement);
                } else {
                  console.log(successStatement);
                }

                if (fs.existsSync(filePath)) {
                  fs.unlinkSync(filePath);
                }

                if (fs.existsSync("pretrained_models")) {
                  fs.rmSync("pretrained_models", { recursive: true });
                  const removedStatement =
                    "Removed pretrained_models directory and local audio file";

                  if (process.env.NODE_ENV === "production") {
                    logger.log(removedStatement);
                  } else {
                    console.log(removedStatement);
                  }
                }

                try {
                  return getBeatPositions(
                    essentia,
                    beatSuccessCallback,
                    videoID,
                    matchDuration,
                    matchExpected,
                    matchArr,
                    trackDataJSON
                  );
                } catch (err) {
                  if (process.env.NODE_ENV === "production") {
                    logger.error(
                      "Error getting beat positions within 'getAudioStems.js' function!",
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
              }
            });
          }
        }
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
      fs.rmSync("YouTubeAudio.mp3", {
        recursive: true,
        force: true,
      });
    }
    return;
  }
};

module.exports = getAudioStems;
