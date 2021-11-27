const fs = require("fs");
const axios = require("axios");
const { PythonShell } = require("python-shell");
const getBeatPositions = require("./getBeatPositions");
const esPkg = require("essentia.js");
const MP3Cutter = require("../mp3Cutter/cutter");
const sendDataToContentful = require("../contentful/sendDataToContentful");
const checkFileExists = require("../utils/checkFileExists");
const { logger } = require("../logger/initializeLogger");
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
            const splittingStatement = "Splitting audio file.";

            if (process.env.NODE_ENV === "production") {
              logger.log(splittingStatement);
            } else {
              console.log(splittingStatement);
            }

            // Split audio into stems and clean up
            PythonShell.run(
              "./python_scripts/spleeter_stems.py",
              {
                args: [filePath],
              },
              (err) => {
                if (err) {
                  throw err;
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

                  // Get beat positions from accompaniment track
                  const beatSuccessCallback = async (buffer) => {
                    if (essentia) {
                      if (buffer) {
                        // Convert the JS float32 typed array into std::vector<float>
                        const inputSignalVector = await essentia.arrayToVector(
                          buffer.getChannelData(0)
                        );

                        const beats = await essentia.BeatTrackerMultiFeature(
                          inputSignalVector,
                          trackDataJSON
                            ? trackDataJSON.tempo
                              ? trackDataJSON.tempo
                              : null
                            : null
                        );

                        if (beats) {
                          if (beats.ticks) {
                            const beatPositions = essentia.vectorToArray(
                              beats.ticks
                            );

                            if (beatPositions) {
                              const roundedBeatPositions = [
                                ...beatPositions,
                              ].map((item) => Number(item.toFixed(4)));

                              if (matchDuration > 360) {
                                const accompanimentFileExists =
                                  await checkFileExists(
                                    "output/YouTubeAudio/accompaniment.mp3"
                                  );

                                const vocalsFileExists = await checkFileExists(
                                  "output/YouTubeAudio/vocals.mp3"
                                );

                                if (
                                  accompanimentFileExists &&
                                  vocalsFileExists
                                ) {
                                  MP3Cutter.cut({
                                    src: "output/YouTubeAudio/accompaniment.mp3",
                                    target:
                                      "output/YouTubeAudio/accompaniment_trimmed.mp3",
                                    start: 0,
                                    // Keep total track time at 6 minutes maximum to keep file at ~6 MB
                                    end: 360,
                                    callback: () =>
                                      MP3Cutter.cut({
                                        src: "output/YouTubeAudio/vocals.mp3",
                                        target:
                                          "output/YouTubeAudio/vocals_trimmed.mp3",
                                        start: 0,
                                        // Keep total track time at 6 minutes maximum to keep file at ~6 MB
                                        end: 360,
                                        callback: () =>
                                          sendDataToContentful(
                                            trackDataJSON,
                                            360,
                                            matchArr,
                                            roundedBeatPositions,
                                            "trimmed",
                                            matchExpected,
                                            videoID
                                          ),
                                      }),
                                  });
                                } else {
                                  const doesntExistStatement =
                                    "Either vocals or accompaniment file does not exist! Moving on to next track.";

                                  if (process.env.NODE_ENV === "production") {
                                    logger.log(doesntExistStatement);
                                  } else {
                                    console.log(doesntExistStatement);
                                  }

                                  return;
                                }
                              } else {
                                sendDataToContentful(
                                  trackDataJSON,
                                  matchDuration,
                                  matchArr,
                                  roundedBeatPositions,
                                  "",
                                  matchExpected,
                                  videoID
                                );
                              }
                            } else {
                              const noBeatPositionsStatement =
                                "No beat positions returned from analysis!";

                              if (process.env.NODE_ENV === "production") {
                                logger.log(noBeatPositionsStatement);
                              } else {
                                console.log(noBeatPositionsStatement);
                              }
                              return;
                            }
                          } else {
                            const noBeatTicksStatement =
                              "No beat ticks returned from analysis!";

                            if (process.env.NODE_ENV === "production") {
                              logger.log(noBeatTicksStatement);
                            } else {
                              console.log(noBeatTicksStatement);
                            }
                            return;
                          }
                        } else {
                          const noBeatsStatement =
                            "No beats returned from analysis!";

                          if (process.env.NODE_ENV === "production") {
                            logger.log(noBeatsStatement);
                          } else {
                            console.log(noBeatsStatement);
                          }
                          return;
                        }
                      } else {
                        const noUsefulBufferStatement =
                          "No useful buffer provided to the Essentia beat matching function. Moving on to next track!";

                        if (process.env.NODE_ENV === "production") {
                          logger.log(noUsefulBufferStatement);
                        } else {
                          console.log(noUsefulBufferStatement);
                        }

                        return;
                      }
                    } else {
                      const errorEssentiaStatement =
                        "Error with Essentia module. Cannot run beat matching function. Moving on to next track!";

                      if (process.env.NODE_ENV === "production") {
                        logger.log(errorEssentiaStatement);
                      } else {
                        console.log(errorEssentiaStatement);
                      }
                      return;
                    }
                  };

                  try {
                    return getBeatPositions(beatSuccessCallback);
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
              }
            );
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
