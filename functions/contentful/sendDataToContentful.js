const contentful = require("contentful-management");
const fs = require("fs");
const path = require("path");
const checkFileExists = require("../utils/checkFileExists");
const { logger } = require("../logger/initializeLogger");
require("dotenv").config();

const sendDataToContentful = async (
  trackDataJSON,
  matchDuration,
  matchArr,
  roundedBeatPositions,
  matchExpected,
  videoID
) => {
  const client = contentful.createClient({
    accessToken: process.env.CONTENT_MANAGEMENT_TOKEN,
  });

  const {
    title,
    artist,
    rank,
    cover,
    tempo,
    key,
    mode,
    currentChart,
    currentChartName,
    goat,
  } = trackDataJSON;

  const deleteOutputDir = async () => {
    if (await checkFileExists(path.resolve(__dirname, "../../output"))) {
      fs.rmSync(path.resolve(__dirname, "../../output"), {
        recursive: true,
        force: true,
      });

      const deletedStatement = "Deleted output directory!";

      if (process.env.NODE_ENV === "production") {
        logger.log(deletedStatement);
      } else {
        console.log(deletedStatement);
      }
    }
  };

  const accompanimentFileExists = await checkFileExists(
    "output/YouTubeAudio/accompaniment.mp3"
  );

  const vocalsFileExists = await checkFileExists(
    "output/YouTubeAudio/vocals.mp3"
  );

  if (accompanimentFileExists && vocalsFileExists) {
    const getErrorLogs = (err) => {
      if (process.env.NODE_ENV === "production") {
        logger.error("Received error during entry creation", {
          indexMeta: true,
          meta: {
            message: err.message,
          },
        });
      } else {
        console.error(`Received error during entry creation: ${err}`);
      }
    };

    client.getSpace(process.env.CONTENTFUL_SPACE_ID).then((space) => {
      space
        .getEnvironment("master")
        .then((environment) => {
          // First add the accompaniment track as an asset in Contentful
          environment
            .createAssetFromFiles({
              fields: {
                title: {
                  "en-US": `${title} by ${artist} Accompaniment`,
                },
                description: {
                  "en-US": `This is the accompaniment mp3 track of the song "${title}" by ${artist}.`,
                },
                file: {
                  "en-US": {
                    contentType: "audio/mp3",
                    fileName: `${title} ${artist} accompaniment.mp3`
                      .toLowerCase()
                      .replace(/ /g, "_"),
                    file: fs.readFileSync(
                      "output/YouTubeAudio/accompaniment.mp3"
                    ),
                  },
                },
              },
            })
            .then((asset) => asset.processForAllLocales())
            .then((asset) => asset.publish())
            .then(async (accompanimentAsset) => {
              // Next add the vocal track as an asset in Contentful
              return environment
                .createAssetFromFiles({
                  fields: {
                    title: {
                      "en-US": `${title} by ${artist} Vocals`,
                    },
                    description: {
                      "en-US": `This is the vocal mp3 track of the song "${title}" by ${artist}.`,
                    },
                    file: {
                      "en-US": {
                        contentType: "audio/mp3",
                        fileName: `${title} ${artist} vocals.mp3`
                          .toLowerCase()
                          .replace(/ /g, "_"),
                        file: fs.readFileSync("output/YouTubeAudio/vocals.mp3"),
                      },
                    },
                  },
                })
                .then((vocalsAsset) => vocalsAsset.processForAllLocales())
                .then((vocalsAsset) => vocalsAsset.publish())
                .then(async (vocalsAsset) => {
                  return environment
                    .createEntry("song", {
                      fields: {
                        title: {
                          "en-US": title,
                        },
                        artist: {
                          "en-US": artist,
                        },
                        sourceId: {
                          "en-US": videoID,
                        },
                        goat: {
                          "en-US": goat ? "yes" : "no",
                        },
                        charts: {
                          "en-US": [
                            {
                              chartName: currentChartName,
                              chartURL: currentChart,
                              rank: rank,
                            },
                          ],
                        },
                        cover: {
                          "en-US": cover,
                        },
                        duration: {
                          "en-US": matchDuration,
                        },
                        tempo: {
                          "en-US": tempo,
                        },
                        key: {
                          "en-US": key,
                        },
                        mode: {
                          "en-US": mode,
                        },
                        beats: {
                          "en-US": roundedBeatPositions.join(", "),
                        },
                        expectedSections: {
                          "en-US": matchExpected.join(", "),
                        },
                        sections: {
                          "en-US": matchArr,
                        },
                        accompaniment: {
                          "en-US": {
                            sys: {
                              id: accompanimentAsset.sys.id,
                              linkType: "Asset",
                              type: "Link",
                            },
                          },
                        },
                        vocals: {
                          "en-US": {
                            sys: {
                              id: vocalsAsset.sys.id,
                              linkType: "Asset",
                              type: "Link",
                            },
                          },
                        },
                      },
                    })
                    .then((entry) => {
                      entry.publish();
                      deleteOutputDir();

                      const successStatement =
                        "Successfully created new entry!";

                      if (process.env.NODE_ENV === "production") {
                        logger.log(successStatement);
                      } else {
                        console.log(successStatement);
                      }

                      return;
                    })
                    .catch((err) => {
                      getErrorLogs(err);
                      deleteOutputDir();
                      return err;
                    });
                })
                .catch((err) => {
                  getErrorLogs(err);
                  deleteOutputDir();
                  return err;
                });
            })
            .catch((err) => {
              getErrorLogs(err);
              deleteOutputDir();
              return err;
            });
        })
        .catch((err) => {
          getErrorLogs(err);
          deleteOutputDir();
          return err;
        });
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
};

module.exports = sendDataToContentful;
