const getTrack = require("./getTrack");
const { listCharts, getChart } = require("billboard-top-100");
const SpotifyWebApi = require("spotify-web-api-node");
const { format, startOfWeek, subDays } = require("date-fns");
const contentful = require("contentful");
const contentfulManagement = require("contentful-management");
const isEqual = require("lodash.isequal");
require("dotenv").config();

const spotifyCredentials = {
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
};

const spotifyApi = new SpotifyWebApi(spotifyCredentials);

const loopCharts = () => {
  listCharts((err, charts) => {
    if (err) {
      console.log(err);
    } else {
      const filteredCharts = charts.filter((chart) => {
        const filterRegex =
          /(artists*)|(albums*)|(soundtracks*)|(billboard 200)|(social 50)|(jazz)|(gospel)|(christian)|(japan)|(k-pop)|(france)|(germany)|(spain)|(switzerland)|(italy)|(australia)|(argentina)|(tropical)|(regional)|(recurrents)|(bubbling)|(adult)|(excl\.)|(breaker)|(sound)|(triller)|(rhythmic)|(digital)|(lyricfind)|(streaming)|(dance club songs)|(pop airplay)|(canadian)/gim;
        const onlyAllowedRegex =
          /(hot dance\/electronic songs)|(dance club songs)|(the official u.k. singles chart)|(mexico airplay)|(billboard canadian hot 100)|(hot latin songs)|(holiday 100)|(lyricfind global)|(greatest of all time alternative songs)|(hot alternative songs)|(hot rap songs)|(hot country songs)|(greatest of all time hot country songs)|(hot r&b\/hip-hop songs)|(hot r&b songs)|(greatest of all time hot r&b\/hip-hop songs)|(rock streaming songs)|(hot hard rock songs)|(greatest of all time mainstream rock songs)/gim;
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
          getChart(usedCharts[i].url, (err, chart) => {
            if (err) {
              console.log(err);
            }

            if (chart) {
              if (chart.songs) {
                const lastSaturday = format(
                  subDays(
                    startOfWeek(new Date(), {
                      weekStartsOn: 6,
                    }),
                    7
                  ),
                  "yyyy-MM-dd"
                );

                getChart(
                  usedCharts[i].url,
                  lastSaturday,
                  async (prevErr, prevChart) => {
                    if (prevErr) {
                      console.log(prevErr);
                    }

                    if (prevChart) {
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

                      const latestCurrSongs = mapApplicableFields(chart.songs);
                      const latestPrevSongs = mapApplicableFields(
                        prevChart.songs
                      );

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
                                // Update charts with latest song lists
                                const previousSongs =
                                  res.items[0].fields.previousSongs;
                                const currentSongs =
                                  res.items[0].fields.currentSongs;

                                const prevEqual = isEqual(
                                  previousSongs,
                                  latestPrevSongs
                                );

                                const currentEqual = isEqual(
                                  currentSongs,
                                  latestCurrSongs
                                );

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
                                              if (!currentEqual || !prevEqual) {
                                                if (!currentEqual) {
                                                  entry.fields.currentSongs = {
                                                    "en-US": latestCurrSongs,
                                                  };
                                                }

                                                if (!prevEqual) {
                                                  entry.fields.previousSongs = {
                                                    "en-US": latestPrevSongs,
                                                  };
                                                }

                                                entry.update().then(() => {
                                                  environment
                                                    .getEntry(
                                                      res.items[0].sys.id
                                                    )
                                                    .then((updatedEntry) => {
                                                      updatedEntry.publish();

                                                      console.log(
                                                        `Chart entry update for ${
                                                          usedCharts[i].name
                                                        } was successful and has been published. ${
                                                          !currentEqual
                                                            ? "Updated current song list. "
                                                            : ""
                                                        }${
                                                          !prevEqual
                                                            ? "Updated previous song list."
                                                            : ""
                                                        }`
                                                      );
                                                    });
                                                });
                                              } else {
                                                console.log(
                                                  `No changes this week for ${usedCharts[i].name} chart.`
                                                );
                                              }
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
                                      environment
                                        .createEntry("chart", {
                                          fields: {
                                            name: {
                                              "en-US": usedCharts[i].name,
                                            },
                                            url: {
                                              "en-US": usedCharts[i].url,
                                            },
                                            currentSongs: {
                                              "en-US": latestCurrSongs,
                                            },
                                            previousSongs: {
                                              "en-US": latestPrevSongs,
                                            },
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

                      // const resolveTrack = async (j) => {
                      //   await getTrack(
                      //     usedCharts[i].name,
                      //     usedCharts[i].url,
                      //     currentSongs,
                      //     latestPrevSongs,
                      //     spotifyApi,
                      //     j
                      //   ).then(() =>
                      //     console.log(
                      //       `Resolved track ${chart.songs[j].title} by ${chart.songs[j].artist}`
                      //     )
                      //   );
                      // };

                      // for (let j = 0; j < chart.songs; j++) {
                      //   if (spotifyApi.getAccessToken()) {
                      //     resolveTrack(j);
                      //   } else {
                      //     // Retrieve an access token
                      //     spotifyApi
                      //       .clientCredentialsGrant()
                      //       .then(
                      //         (data) => {
                      //           console.log(
                      //             "Retrieved new access token: " +
                      //               data.body["access_token"]
                      //           );

                      //           // Save the access token so that it's used in future calls
                      //           spotifyApi.setAccessToken(
                      //             data.body["access_token"]
                      //           );
                      //         },
                      //         (err) => {
                      //           console.log(
                      //             "Something went wrong when retrieving an access token",
                      //             err.message
                      //           );
                      //         }
                      //       )
                      //       .then(() => resolveTrack(j));
                      //   }
                      // }
                    }
                  }
                );
              }
            }
          });
        }, i * 1200000);
      }
    }
  });
};

module.exports = loopCharts;
