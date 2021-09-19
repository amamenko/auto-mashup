const contentful = require("contentful");
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
      select: "fields.name",
      content_type: "chart",
    })
    .then(async (res) => {
      if (res) {
        if (res.items) {
          if (res.items.length > 0) {
            const nameArr = res.items.map((item) => {
              return {
                name: item.fields,
                id: item.sys.id,
              };
            });

            const loopIndividualChartSongs = async (i) => {
              return client.getEntry(nameArr[i].id).then(async (entry) => {
                const fields = entry.fields;

                const resolveTrack = async (index) => {
                  return getTrack(
                    fields.name,
                    fields.url,
                    fields.currentSongs,
                    fields.previousSongs,
                    spotifyApi,
                    index
                  ).then(() => {
                    if (
                      fields.currentSongs[index].title &&
                      fields.currentSongs[index].artist
                    ) {
                      console.log(
                        `Resolved track ${fields.currentSongs[index].title} by ${fields.currentSongs[index].artist}`
                      );
                    }
                  });
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
                        spotifyApi.setAccessToken(data.body["access_token"]);
                      },
                      (err) => {
                        console.log(
                          "Something went wrong when retrieving an access token",
                          err.message
                        );
                      }
                    )
                    .then(async () => await resolveTrack(index));
                };

                for (let j = 0; j < fields.currentSongs.length; j++) {
                  if (spotifyApi.getAccessToken()) {
                    await resolveTrack(j);
                  } else {
                    await getCredentialsFirst(j);
                  }
                }
              });
            };

            for (let i = 0; i < nameArr.length; i++) {
              await loopIndividualChartSongs(i);
            }
          }
        }
      }
    });
};

module.exports = loopSongs;
