const contentful = require("contentful");
const contentfulManagement = require("contentful-management");
const { logger } = require("../logger/initializeLogger");
require("dotenv").config();

const updatePreviousEntries = async (topSong, songRank, currentChart, goat) => {
  const title = topSong.title;
  const artist = topSong.artist;

  // Access to Contentful Delivery API
  const client = contentful.createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  });

  return await client
    .getEntries({
      "fields.goat": goat ? "yes" || "both" : "no",
      content_type: "song",
      limit: 1000,
    })
    .then(async (res) => {
      if (res.items) {
        const matchedEntry = res.items.find((item) =>
          item.fields.charts.find(
            (chart) =>
              chart.chartURL === currentChart && chart.rank === songRank
          )
        );

        if (matchedEntry) {
          if (matchedEntry.fields) {
            const fields = matchedEntry.fields;

            // If old match does not have the same ranking now
            if (fields.title !== title || fields.artist !== artist) {
              const charts = fields.charts;

              const containsCurrentChart = charts.find(
                (item) => item.chartURL === currentChart
              );

              const indexCurrentChart = charts.findIndex(
                (item) => item.chartURL === currentChart
              );

              if (containsCurrentChart) {
                if (indexCurrentChart >= 0) {
                  // Access to Contentful Management API
                  const managementClient = contentfulManagement.createClient({
                    accessToken: process.env.CONTENT_MANAGEMENT_TOKEN,
                  });

                  if (matchedEntry.sys) {
                    const entryID = matchedEntry.sys.id;
                    if (entryID) {
                      managementClient
                        .getSpace(process.env.CONTENTFUL_SPACE_ID)
                        .then((space) => {
                          space.getEnvironment("master").then((environment) => {
                            environment.getEntry(entryID).then((entry) => {
                              charts.splice(indexCurrentChart, 1);
                              // If entry appears on more charts
                              // -> Leave entry, just update charts it appears on
                              if (charts.length > 0) {
                                entry.fields.charts = {
                                  "en-US": charts,
                                };

                                entry.update().then(() => {
                                  environment
                                    .getEntry(entryID)
                                    .then((updatedEntry) => {
                                      updatedEntry.publish();

                                      const successStatement = `The charts field for the track "${fields.title}" by ${fields.artist} has been updated successfully and published.`;

                                      if (
                                        process.env.NODE_ENV === "production"
                                      ) {
                                        logger.log(successStatement);
                                      } else {
                                        console.log(successStatement);
                                      }
                                    });
                                });
                              } else {
                                // If entry does NOT appear in any other charts
                                // AND entry does not appear in any other position on the CURRENT chart
                                // -> Unpublish and delete entry assets and entry itself
                                if (fields) {
                                  const accompaniment = fields.accompaniment;
                                  const vocals = fields.vocals;

                                  const accompanimentID = accompaniment.sys.id;
                                  const vocalsID = vocals.sys.id;

                                  const delayExecution = (ms) =>
                                    new Promise((resolve, reject) => {
                                      setTimeout((item) => resolve(), ms);
                                    });

                                  // Unpublish and delete entry itself
                                  entry
                                    .unpublish()
                                    .then(async (unpublishedEntry) => {
                                      const unpublishedStatement = `Entry for track "${fields.title}" by ${fields.artist} has been unpublished. Deleting now...`;

                                      if (
                                        process.env.NODE_ENV === "production"
                                      ) {
                                        logger.log(unpublishedStatement);
                                      } else {
                                        console.log(unpublishedStatement);
                                      }

                                      await delayExecution(1500);

                                      unpublishedEntry.delete();
                                    })
                                    .then(async () => {
                                      const deletedStatement = `Entry for track "${fields.title}" by ${fields.artist} has been deleted.`;

                                      if (
                                        process.env.NODE_ENV === "production"
                                      ) {
                                        logger.log(deletedStatement);
                                      } else {
                                        console.log(deletedStatement);
                                      }

                                      await delayExecution(1500);

                                      // Delete accompaniment asset
                                      if (accompanimentID) {
                                        environment
                                          .getAsset(accompanimentID)
                                          .then((accompanimentAsset) => {
                                            accompanimentAsset
                                              .unpublish()
                                              .then(
                                                async (
                                                  unpublishedAccompaniment
                                                ) => {
                                                  const accompanimentUnpublishedStatement = `Accompaniment asset for track "${fields.title}" by ${fields.artist} has been unpublished. Deleting now...`;

                                                  if (
                                                    process.env.NODE_ENV ===
                                                    "production"
                                                  ) {
                                                    logger.log(
                                                      accompanimentUnpublishedStatement
                                                    );
                                                  } else {
                                                    console.log(
                                                      accompanimentUnpublishedStatement
                                                    );
                                                  }

                                                  await delayExecution(1500);

                                                  unpublishedAccompaniment.delete();
                                                }
                                              )
                                              .then(async () => {
                                                const accompanimentDeletedStatement = `Accompaniment asset for track "${fields.title}" by ${fields.artist} has been deleted.`;

                                                if (
                                                  process.env.NODE_ENV ===
                                                  "production"
                                                ) {
                                                  logger.log(
                                                    accompanimentDeletedStatement
                                                  );
                                                } else {
                                                  console.log(
                                                    accompanimentDeletedStatement
                                                  );
                                                }

                                                await delayExecution(1500);

                                                // Delete vocals asset
                                                if (vocalsID) {
                                                  environment
                                                    .getAsset(vocalsID)
                                                    .then((vocalsAsset) => {
                                                      vocalsAsset
                                                        .unpublish()
                                                        .then(
                                                          async (
                                                            unpublishedVocalsAsset
                                                          ) => {
                                                            const voxUnpublishedStatement = `Vocals asset for track "${fields.title}" by ${fields.artist} has been unpublished. Deleting now...`;

                                                            if (
                                                              process.env
                                                                .NODE_ENV ===
                                                              "production"
                                                            ) {
                                                              logger.log(
                                                                voxUnpublishedStatement
                                                              );
                                                            } else {
                                                              console.log(
                                                                voxUnpublishedStatement
                                                              );
                                                            }

                                                            await delayExecution(
                                                              1500
                                                            );

                                                            unpublishedVocalsAsset.delete();
                                                          }
                                                        )
                                                        .then(() => {
                                                          const voxDeletedStatement = `Vocals asset for track "${fields.title}" by ${fields.artist} has been deleted.`;

                                                          if (
                                                            process.env
                                                              .NODE_ENV ===
                                                            "production"
                                                          ) {
                                                            logger.log(
                                                              voxDeletedStatement
                                                            );
                                                          } else {
                                                            console.log(
                                                              voxDeletedStatement
                                                            );
                                                          }

                                                          return;
                                                        })
                                                        .catch((err) => {
                                                          if (
                                                            process.env
                                                              .NODE_ENV ===
                                                            "production"
                                                          ) {
                                                            logger.error(
                                                              `Error unpublishing and deleting vocals asset for track "${fields.title}" by ${fields.artist}`,
                                                              {
                                                                indexMeta: true,
                                                                meta: {
                                                                  message:
                                                                    err.message,
                                                                },
                                                              }
                                                            );
                                                          } else {
                                                            console.error(err);
                                                          }
                                                        });
                                                    });
                                                }
                                              })
                                              .catch((err) => {
                                                if (
                                                  process.env.NODE_ENV ===
                                                  "production"
                                                ) {
                                                  logger.error(
                                                    `Error unpublishing and deleting accompaniment asset for track "${fields.title}" by ${fields.artist}`,
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
                                          });
                                      }
                                    })
                                    .catch((err) => {
                                      if (
                                        process.env.NODE_ENV === "production"
                                      ) {
                                        logger.error(
                                          `Error unpublishing and deleting Contentful entry for track "${fields.title}" by ${fields.artist}`,
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
                                }
                              }
                            });
                          });
                        });
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
    .catch((err) => {
      if (process.env.NODE_ENV === "production") {
        logger.error(
          "Error getting Contentful entries within updatePreviousEntries.js file.",
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
    });
};

module.exports = updatePreviousEntries;
