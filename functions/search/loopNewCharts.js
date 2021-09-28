const { listCharts, getChart } = require("billboard-top-100");
const { format, startOfWeek, addDays } = require("date-fns");
const contentful = require("contentful");
const contentfulManagement = require("contentful-management");
require("dotenv").config();

const loopNewCharts = (currentOrPrevious) => {
  listCharts((err, charts) => {
    if (err) {
      console.log(err);
    } else {
      const filteredCharts = charts.filter((chart) => {
        const filterRegex =
          /(artists*)|(albums*)|(soundtracks*)|(billboard 200)|(social 50)|(jazz)|(gospel)|(christian)|(japan)|(k-pop)|(france)|(germany)|(spain)|(switzerland)|(italy)|(australia)|(argentina)|(tropical)|(regional)|(recurrents)|(bubbling)|(adult)|(excl\.)|(breaker)|(sound)|(triller)|(rhythmic)|(digital)|(lyricfind)|(streaming)|(dance club songs)|(pop airplay)|(canadian)|(summer)|(greatest)|(holiday)|(80)|(90)/gim;
        const onlyAllowedRegex =
          /(hot dance\/electronic songs)|(dance club songs)|(mexico airplay)|(billboard canadian hot 100)|(hot latin songs)|(holiday 100)|(lyricfind global)|(greatest of all time alternative songs)|(hot alternative songs)|(hot rap songs)|(hot country songs)|(greatest of all time hot country songs)|(hot r&b\/hip-hop songs)|(hot r&b songs)|(greatest of all time hot r&b\/hip-hop songs)|(rock streaming songs)|(hot hard rock songs)|(greatest of all time mainstream rock songs)/gim;
        const name = chart.name.toLowerCase();

        if (
          name.includes("u.k.") ||
          name.includes("mexico") ||
          name.includes("canadian") ||
          name.includes("canada") ||
          name.includes("latin") ||
          name.includes("holiday") ||
          name.includes("alternative") ||
          name.includes("rap") ||
          name.includes("country") ||
          name.includes("r&b") ||
          name.includes("rock") ||
          name.includes("dance")
        ) {
          return onlyAllowedRegex.test(name) && !filterRegex.test(name);
        } else {
          return !filterRegex.test(name);
        }
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

          const lastSaturday = format(
            startOfWeek(new Date(), {
              weekStartsOn: 6,
            }),
            "yyyy-MM-dd"
          );

          getChart(
            usedCharts[i].url,
            currentOrPrevious === "current" ? upcomingSaturday : lastSaturday,
            async (err, chart) => {
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
                      const managementClient =
                        contentfulManagement.createClient({
                          accessToken: process.env.CONTENT_MANAGEMENT_TOKEN,
                        });

                      if (res.items) {
                        if (res.items[0]) {
                          if (res.items[0].fields) {
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
                                          if (currentOrPrevious === "current") {
                                            entry.fields.currentSongs = {
                                              "en-US": queriedSongs,
                                            };
                                          } else {
                                            entry.fields.previousSongs = {
                                              "en-US": queriedSongs,
                                            };
                                          }

                                          entry.fields.date = {
                                            "en-US": upcomingSaturday,
                                          };

                                          entry.fields.updatedThisWeek = {
                                            "en-US": true,
                                          };

                                          entry.fields.loopedThisWeek = {
                                            "en-US": false,
                                          };

                                          entry.fields.loopInProgress = {
                                            "en-US": false,
                                          };

                                          // Only publish changes when both current and previous charts have been looped
                                          entry.update().then(() => {
                                            if (
                                              currentOrPrevious !== "current"
                                            ) {
                                              environment
                                                .getEntry(res.items[0].sys.id)
                                                .then((updatedEntry) => {
                                                  updatedEntry.publish();

                                                  console.log(
                                                    `Chart entry update for ${usedCharts[i].name} was successful and has been published. Updated current and previous song lists.`
                                                  );
                                                });
                                            } else {
                                              console.log(
                                                `Contentful entry for ${usedCharts[i].name} chart's current song list has been changed.`
                                              );
                                            }
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

                                  const prevObj = {
                                    previousSongs: {
                                      "en-US": queriedSongs,
                                    },
                                  };

                                  environment
                                    .createEntry("chart", {
                                      fields:
                                        currentOrPrevious === "current"
                                          ? {
                                              ...basicInfoObj,
                                              ...currentObj,
                                            }
                                          : {
                                              ...basicInfoObj,
                                              ...prevObj,
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
            }
          );
        }, i * 30000);
      }
    }
  });
};

module.exports = loopNewCharts;
