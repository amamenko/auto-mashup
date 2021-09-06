const contentful = require("contentful-management");
const fs = require("fs");

const sendDataToContentful = (
  trackDataJSON,
  matchDuration,
  matchArr,
  roundedBeatPositions,
  trimmed
) => {
  const client = contentful.createClient({
    accessToken: process.env.CONTENT_MANAGEMENT_TOKEN,
  });

  const { title, artist, rank, cover, tempo, key, mode, currentChart } =
    trackDataJSON;

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
                    trimmed === "trimmed"
                      ? "output/YouTubeAudio/accompaniment_trimmed.mp3"
                      : "output/YouTubeAudio/accompaniment.mp3"
                  ),
                },
              },
            },
          })
          .then((asset) => asset.processForAllLocales())
          .then(async (accompanimentAsset) => {
            accompanimentAsset.publish();

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
                      file: fs.readFileSync(
                        trimmed === "trimmed"
                          ? "output/YouTubeAudio/vocals_trimmed.mp3"
                          : "output/YouTubeAudio/vocals.mp3"
                      ),
                    },
                  },
                },
              })
              .then((vocalsAsset) => vocalsAsset.processForAllLocales())
              .then(async (vocalsAsset) => {
                vocalsAsset.publish();

                return environment
                  .createEntry("song", {
                    fields: {
                      title: {
                        "en-US": title,
                      },
                      artist: {
                        "en-US": artist,
                      },
                      charts: {
                        "en-US": [
                          {
                            chart: currentChart,
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
                      sections: {
                        "en-US": matchArr,
                      },
                      accompaniment: {
                        "en-US": [
                          {
                            sys: {
                              id: accompanimentAsset.sys.id,
                              linkType: "Asset",
                              type: "Link",
                            },
                          },
                        ],
                      },
                      vocals: {
                        "en-AU": [
                          {
                            sys: {
                              id: vocalsAsset.sys.id,
                              linkType: "Asset",
                              type: "Link",
                            },
                          },
                        ],
                      },
                    },
                  })
                  .then((entry) => {
                    entry.publish();
                    fs.rmdirSync("../output", { recursive: true });
                    console.log("Successfully created new entry!");
                    return;
                  })
                  .catch((err) => {
                    console.log(`Received error during entry creation: ${err}`);
                    fs.rmdirSync("../output", { recursive: true });
                    return err;
                  });
              })
              .catch((err) => {
                console.log(`Received error during entry creation: ${err}`);
                fs.rmdirSync("../output", { recursive: true });
                return err;
              });
          })
          .catch((err) => {
            console.log(`Received error during entry creation: ${err}`);
            fs.rmdirSync("../output", { recursive: true });
            return err;
          });
      })
      .catch((err) => {
        console.log(`Received error during entry creation: ${err}`);
        fs.rmdirSync("../output", { recursive: true });
        return err;
      });
  });
};

module.exports = sendDataToContentful;
