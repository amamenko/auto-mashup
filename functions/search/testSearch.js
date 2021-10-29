const getTrack = require("./getTrack");
const { getChart } = require("billboard-top-100");
const SpotifyWebApi = require("spotify-web-api-node");
const contentful = require("contentful");

// For future testing of individual songs of charts
const testSearch = async (testChart, testIndex) => {
  getChart(testChart, async (err, chart) => {
    if (err) {
      console.log(err);
    }

    const songs = chart.songs;

    const client = contentful.createClient({
      space: process.env.CONTENTFUL_SPACE_ID,
      accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
    });

    await client
      .getEntries({
        "fields.url": testChart,
        content_type: "chart",
      })
      .then(async (res) => {
        if (res) {
          if (res.items) {
            client.getEntry(res.items[0].sys.id).then(async (entry) => {
              const spotifyCredentials = {
                clientId: process.env.SPOTIFY_CLIENT_ID,
                clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
              };

              const spotifyApi = new SpotifyWebApi(spotifyCredentials);

              const fields = entry.fields;

              const resolveTrack = (index) => {
                return getTrack(
                  fields.name,
                  fields.url,
                  fields.currentSongs,
                  fields.previousSongs,
                  fields.goat,
                  spotifyApi,
                  testIndex
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
                      spotifyApi.setAccessToken(data.body["access_token"]);
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

              getCredentialsFirst(testIndex);
            });
          }
        }
      });
  });
};

module.exports = testSearch;
