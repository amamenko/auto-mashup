const contentful = require("contentful");
const SpotifyWebApi = require("spotify-web-api-node");
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

            return await client.getEntry(nameArr[0].id).then((entry) => {
              const fields = entry.fields;

              const resolveTrack = async (j) => {
                await getTrack(
                  fields.name,
                  fields.url,
                  fields.currentSongs,
                  fields.previousSongs,
                  spotifyApi,
                  j
                ).then(() => {
                  if (
                    fields.currentSongs[j].title &&
                    fields.currentSongs[j].artist
                  ) {
                    console.log(
                      `Resolved track ${fields.currentSongs[j].title} by ${fields.currentSongs[j].artist}`
                    );
                  }
                });
              };

              for (let j = 0; j < fields.currentSongs; j++) {
                if (spotifyApi.getAccessToken()) {
                  resolveTrack(j);
                } else {
                  // Retrieve an access token
                  spotifyApi
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
                    .then(() => resolveTrack(j));
                }
              }
            });
          }
        }
      }
    });
};

module.exports = loopSongs;
