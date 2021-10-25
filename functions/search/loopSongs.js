const contentful = require("contentful");
const SpotifyWebApi = require("spotify-web-api-node");
const updateChartLoopInProgress = require("../contentful/updateChartLoopInProgress");
const getTrack = require("./getTrack");
require("dotenv").config();

const loopSongs = async () => {
  // Access to Contentful Delivery API
  const client = contentful.createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  });

  // Check if there are any loops in progress
  return await client
    .getEntries({
      "fields.updatedThisWeek": true,
      "fields.loopedThisWeek": false,
      "fields.loopInProgress": true,
      select: "fields.name",
      content_type: "chart",
    })
    .then(async (res) => {
      if (res) {
        if (res.items) {
          // If there's no loop in progress at the moment
          if (res.items.length === 0) {
            return await client
              .getEntries({
                "fields.updatedThisWeek": true,
                "fields.loopedThisWeek": false,
                select: "fields.name",
                content_type: "chart",
              })
              .then(async (res) => {
                if (res) {
                  if (res.items) {
                    if (res.items.length > 0) {
                      const nameArr = res.items.map((item) => {
                        return {
                          name: item.fields.name,
                          id: item.sys.id,
                        };
                      });

                      const firstChart = nameArr[0];

                      if (firstChart) {
                        await updateChartLoopInProgress(
                          firstChart,
                          "in progress"
                        ).then(() => {
                          client.getEntry(firstChart.id).then(async (entry) => {
                            const spotifyCredentials = {
                              clientId: process.env.SPOTIFY_CLIENT_ID,
                              clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
                            };

                            const spotifyApi = new SpotifyWebApi(
                              spotifyCredentials
                            );

                            const fields = entry.fields;

                            const resolveTrack = (index) => {
                              return getTrack(
                                fields.name,
                                fields.url,
                                fields.currentSongs,
                                fields.previousSongs,
                                fields.goat,
                                spotifyApi,
                                index
                              );
                            };

                            const getCredentialsFirst = async (index) => {
                              // Retrieve an access token
                              return spotifyApi
                                .clientCredentialsGrant()
                                .then(
                                  (data) => {
                                    console.log(
                                      "Retrieved new access token: " +
                                        data.body["access_token"]
                                    );

                                    // Save the access token so that it's used in future calls
                                    spotifyApi.setAccessToken(
                                      data.body["access_token"]
                                    );
                                  },
                                  (err) => {
                                    console.log(
                                      "Something went wrong when retrieving an access token",
                                      err.message
                                    );
                                  }
                                )
                                .then(async () => await resolveTrack(index))
                                .catch((error) => {
                                  console.log(error);
                                  return;
                                });
                            };

                            for (
                              let i = 0;
                              i < fields.currentSongs.length;
                              i++
                            ) {
                              // Wait 5 minutes between individual song analysis
                              setTimeout(() => {
                                // Every half hour, refresh Spotify token
                                if (
                                  spotifyApi.getAccessToken() &&
                                  i % 6 !== 0
                                ) {
                                  resolveTrack(i);
                                } else {
                                  getCredentialsFirst(i);
                                }

                                // If last iteration
                                if (i === fields.currentSongs.length - 1) {
                                  setTimeout(() => {
                                    updateChartLoopInProgress(
                                      firstChart,
                                      "done"
                                    );
                                  }, 240000);
                                }
                              }, i * 300000);
                            }
                          });
                        });
                      }
                    }
                  }
                }
              });
          }
        }
      }
    });
};

module.exports = loopSongs;
