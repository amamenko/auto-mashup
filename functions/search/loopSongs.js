const contentful = require("contentful");
const contentfulManagement = require("contentful-management");
const SpotifyWebApi = require("spotify-web-api-node");
const getTrack = require("./getTrack");
require("dotenv").config();

const loopSongs = async () => {
  // Access to Contentful Delivery API
  const client = contentful.createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  });

  const spotifyCredentials = {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  };

  const spotifyApi = new SpotifyWebApi(spotifyCredentials);

  return await client
    .getEntries({
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
                        const updateChartLoopInProgress = () => {
                          // Access to Contentful Management API
                          const managementClient =
                            contentfulManagement.createClient({
                              accessToken: process.env.CONTENT_MANAGEMENT_TOKEN,
                            });

                          managementClient
                            .getSpace(process.env.CONTENTFUL_SPACE_ID)
                            .then((space) => {
                              space
                                .getEnvironment("master")
                                .then((environment) => {
                                  environment
                                    .getEntry(firstChart.id)
                                    .then((entry) => {
                                      entry.fields.loopInProgress = {
                                        "en-US": true,
                                      };
                                      entry.update().then(() => {
                                        console.log(
                                          `Entry update was successful! ${firstChart.name} chart loop marked as in progress.`
                                        );
                                      });
                                    });
                                });

                              return;
                            });
                        };
                      }

                      // const loopIndividualChartSongs = async (i) => {
                      //   return client
                      //     .getEntry(nameArr[i].id)
                      //     .then(async (entry) => {
                      //       const fields = entry.fields;

                      //       const resolveTrack = async (index) => {
                      //         return getTrack(
                      //           fields.name,
                      //           fields.url,
                      //           fields.currentSongs,
                      //           fields.previousSongs,
                      //           spotifyApi,
                      //           index
                      //         ).then(() => {
                      //           if (
                      //             fields.currentSongs[index].title &&
                      //             fields.currentSongs[index].artist
                      //           ) {
                      //             console.log(
                      //               `Resolved track ${fields.currentSongs[index].title} by ${fields.currentSongs[index].artist}`
                      //             );
                      //           }
                      //         });
                      //       };

                      //       const getCredentialsFirst = async (index) => {
                      //         // Retrieve an access token
                      //         return spotifyApi
                      //           .clientCredentialsGrant()
                      //           .then(
                      //             (data) => {
                      //               console.log(
                      //                 "Retrieved new access token: " +
                      //                   data.body["access_token"]
                      //               );

                      //               // Save the access token so that it's used in future calls
                      //               spotifyApi.setAccessToken(
                      //                 data.body["access_token"]
                      //               );
                      //             },
                      //             (err) => {
                      //               console.log(
                      //                 "Something went wrong when retrieving an access token",
                      //                 err.message
                      //               );
                      //             }
                      //           )
                      //           .then(async () => await resolveTrack(index));
                      //       };

                      //       const delayedGetTrack = async (callback) => {
                      //         setTimeout(async () => {
                      //           return await callback();
                      //         }, 180000);
                      //       };

                      //       // for (
                      //       //   let j = 0;
                      //       //   j < fields.currentSongs.length;
                      //       //   j++
                      //       // ) {
                      //       //   if (spotifyApi.getAccessToken()) {
                      //       //     await delayedGetTrack(resolveTrack(j));
                      //       //   } else {
                      //       //     await delayedGetTrack(getCredentialsFirst(j));
                      //       //   }
                      //       // }
                      //     });
                      // };

                      // for (let i = 0; i < nameArr.length; i++) {
                      //   console.log(`Now looping over ${nameArr[i].name}`);
                      //   await loopIndividualChartSongs(i);
                      // }
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
