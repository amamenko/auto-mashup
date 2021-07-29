const express = require("express");
const app = express();
const SpotifyWebApi = require("spotify-web-api-node");
const getTrack = require("./functions/getTrack");
require("dotenv").config();

const port = process.env.PORT || 4000;

const spotifyCredentials = {
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
};

const spotifyApi = new SpotifyWebApi(spotifyCredentials);

if (spotifyApi.getAccessToken()) {
  getTrack(spotifyApi);
} else {
  // Retrieve an access token
  spotifyApi
    .clientCredentialsGrant()
    .then(
      (data) => {
        console.log("The access token expires in " + data.body["expires_in"]);
        console.log("The access token is " + data.body["access_token"]);

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
    .then(() => getTrack(spotifyApi));
}

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
