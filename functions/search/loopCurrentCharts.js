const contentful = require("contentful");
const contentfulManagement = require("contentful-management");
const { getChart } = require("../billboard/getChart");
const { format, startOfWeek, addDays } = require("date-fns");
const deepEqual = require("deep-equal");
const { logger } = require("../logger/initializeLogger");
require("dotenv").config();

const loopCurrentCharts = async (goat) => {
  // Access to Contentful Delivery API
  const client = contentful.createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  });

  await client
    .getEntries({
      "fields.updatedThisWeek": false,
      "fields.goat": goat === "goat" ? true : false,
      content_type: "chart",
    })
    .then(async (res) => {
      if (res.items) {
        if (res.items[0]) {
          if (res.items[0].fields) {
            const fields = res.items[0].fields;

            getChart(fields.url, async (err, upcomingChart) => {
              if (err) {
                if (process.env.NODE_ENV === "production") {
                  logger.error(
                    `Something went wrong when getting chart with URL: ${fields.url}.`,
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
              }

              const mapApplicableFields = (list) => {
                return list.map((item) => {
                  return {
                    rank: item.rank,
                    title: item.title,
                    artist: item.artist,
                    cover: item.cover,
                  };
                });
              };

              if (upcomingChart) {
                if (upcomingChart.songs) {
                  const queriedSongs = mapApplicableFields(upcomingChart.songs);

                  const mapSameFormat = (item) => {
                    return {
                      rank: item.rank,
                      title: item.title,
                      artist: item.artist,
                    };
                  };

                  const original = fields.currentSongs.map(mapSameFormat);
                  const current = queriedSongs.map(mapSameFormat);

                  const changed = !deepEqual(original, current);

                  const managementClient = contentfulManagement.createClient({
                    accessToken: process.env.CONTENT_MANAGEMENT_TOKEN,
                  });

                  const mostRecentSaturday = fields.date;

                  managementClient
                    .getSpace(process.env.CONTENTFUL_SPACE_ID)
                    .then((space) => {
                      space.getEnvironment("master").then((environment) => {
                        environment
                          .getEntry(res.items[0].sys.id)
                          .then((entry) => {
                            if (entry) {
                              const upcomingSaturday = format(
                                addDays(
                                  startOfWeek(new Date(), {
                                    weekStartsOn: 6,
                                  }),
                                  7
                                ),
                                "yyyy-MM-dd"
                              );

                              if (mostRecentSaturday !== upcomingSaturday) {
                                if (changed) {
                                  entry.fields.currentSongs = {
                                    "en-US": queriedSongs,
                                  };
                                }

                                entry.fields.date = {
                                  "en-US": upcomingSaturday,
                                };

                                entry.fields.updatedThisWeek = {
                                  "en-US": changed,
                                };

                                entry.fields.loopedThisWeek = {
                                  "en-US": false,
                                };

                                entry.fields.loopInProgress = {
                                  "en-US": false,
                                };

                                entry
                                  .update()
                                  .then(() => {
                                    environment
                                      .getEntry(res.items[0].sys.id)
                                      .then((updatedEntry) => {
                                        updatedEntry.publish();

                                        const successStatement = `Chart entry update for ${fields.name} was successful and has been published. Updated current song list.`;

                                        if (
                                          process.env.NODE_ENV === "production"
                                        ) {
                                          logger.log(successStatement);
                                        } else {
                                          console.log(successStatement);
                                        }
                                      });
                                  })
                                  .catch((err) => {
                                    if (process.env.NODE_ENV === "production") {
                                      logger.error(
                                        `Something went wrong when updating the chart enty for ${fields.name}.`,
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
                    })
                    .catch((err) => {
                      if (process.env.NODE_ENV === "production") {
                        logger.error(
                          `Something went wrong when getting chart with URL: ${fields.url}.`,
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
          }
        }
      }
    })
    .catch((err) => {
      if (process.env.NODE_ENV === "production") {
        logger.error(
          "Something went wrong when getting the Contentful management space!",
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
};

module.exports = loopCurrentCharts;
