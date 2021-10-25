const { listCharts, getChart } = require("billboard-top-100");
const { format, startOfWeek, addDays } = require("date-fns");
const contentful = require("contentful");
const contentfulManagement = require("contentful-management");
const deepEqual = require("deep-equal");
require("dotenv").config();

const loopGoatCharts = () => {
  listCharts((err, charts) => {
    if (err) {
      console.log(err);
    } else {
      const filteredCharts = charts.filter((chart) => {
        const name = chart.name.toLowerCase();

        return (
          (name.includes("greatest") ||
            name.includes("'80s") ||
            name.includes("'90s")) &&
          name.includes("songs") &&
          !name.includes("artists") &&
          !name.includes("albums") &&
          !name.includes("latin")
        );
      });

      const usedCharts = filteredCharts.map((item) => {
        return {
          name: item.name,
          url: item.url.split("/charts/")[1],
        };
      });

      for (let i = 0; i < usedCharts.length; i++) {
        setTimeout(() => {
          const upcomingSaturday = format(
            addDays(
              startOfWeek(new Date(), {
                weekStartsOn: 6,
              }),
              7
            ),
            "yyyy-MM-dd"
          );

          getChart(usedCharts[i].url, async (err, chart) => {
            if (err) {
              console.log(err);
            }

            if (chart) {
              if (chart.songs) {
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

                const queriedSongs = mapApplicableFields(chart.songs);

                // Access to Contentful Delivery API
                const client = contentful.createClient({
                  space: process.env.CONTENTFUL_SPACE_ID,
                  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
                });

                await client
                  .getEntries({
                    "fields.name": usedCharts[i].name,
                    content_type: "chart",
                  })
                  .then(async (res) => {
                    const managementClient = contentfulManagement.createClient({
                      accessToken: process.env.CONTENT_MANAGEMENT_TOKEN,
                    });

                    if (res.items) {
                      if (res.items[0]) {
                        if (res.items[0].fields) {
                          const mapSameFormat = (item) => {
                            return {
                              rank: item.rank,
                              title: item.title,
                              artist: item.artist,
                            };
                          };

                          const original =
                            res.items[0].fields.currentSongs.map(mapSameFormat);
                          const current = queriedSongs.map(mapSameFormat);

                          const changed = !deepEqual(original, current);

                          managementClient
                            .getSpace(process.env.CONTENTFUL_SPACE_ID)
                            .then((space) => {
                              space
                                .getEnvironment("master")
                                .then((environment) => {
                                  environment
                                    .getEntry(res.items[0].sys.id)
                                    .then((entry) => {
                                      if (entry) {
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

                                        entry.fields.goat = {
                                          "en-US": true,
                                        };

                                        entry.update().then(() => {
                                          environment
                                            .getEntry(res.items[0].sys.id)
                                            .then((updatedEntry) => {
                                              updatedEntry.publish();

                                              console.log(
                                                `Chart entry update for ${usedCharts[i].name} was successful and has been published. Updated song lists.`
                                              );
                                            });
                                        });
                                      }
                                    });
                                });

                              return;
                            });
                        }
                      } else {
                        // Create a new chart entry
                        managementClient
                          .getSpace(process.env.CONTENTFUL_SPACE_ID)
                          .then((space) => {
                            space
                              .getEnvironment("master")
                              .then((environment) => {
                                const basicInfoObj = {
                                  name: {
                                    "en-US": usedCharts[i].name,
                                  },
                                  url: {
                                    "en-US": usedCharts[i].url,
                                  },
                                  date: {
                                    "en-US": upcomingSaturday,
                                  },
                                  goat: {
                                    "en-US": goat ? true : false,
                                  },
                                  updatedThisWeek: {
                                    "en-US": false,
                                  },
                                  loopedThisWeek: {
                                    "en-US": false,
                                  },
                                  loopInProgress: {
                                    "en-US": false,
                                  },
                                };

                                const currentObj = {
                                  currentSongs: {
                                    "en-US": queriedSongs,
                                  },
                                };

                                environment
                                  .createEntry("chart", {
                                    fields: {
                                      ...basicInfoObj,
                                      ...currentObj,
                                    },
                                  })
                                  .then((entry) => {
                                    entry.publish();
                                    console.log(
                                      `Successfully created new entry for ${usedCharts[i].name} chart.`
                                    );
                                    return;
                                  })
                                  .catch((err) => {
                                    console.log(
                                      `Received error during ${usedCharts[i].name} chart entry creation: ${err}`
                                    );
                                    return err;
                                  });
                              });
                          });
                      }
                    }
                  });
              }
            }
          });
        }, i * 30000);
      }
    }
  });
};

module.exports = loopGoatCharts;
