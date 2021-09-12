const express = require("express");
const app = express();
const SpotifyWebApi = require("spotify-web-api-node");
const contentful = require("contentful");
require("dotenv").config();

const port = process.env.PORT || 4000;

const spotifyCredentials = {
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
};

const spotifyApi = new SpotifyWebApi(spotifyCredentials);

// const client = contentful.createClient({
//   space: process.env.CONTENTFUL_SPACE_ID,
//   accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
// });

// client
//   .getEntries({
//     content_type: "song",
//   })
//   .then((res) => {
//     if (res.items) {
//       res.items.forEach((item) => {
//         if (item.fields) {
//           console.log(item);
//         }
//       });
//     }
//   })
//   .catch((err) => console.log(err));

// if (spotifyApi.getAccessToken()) {
//   getTrack("The Hot 100", "hot-100", null, spotifyApi);
// } else {
//   // Retrieve an access token
//   spotifyApi
//     .clientCredentialsGrant()
//     .then(
//       (data) => {
//         console.log("The access token expires in " + data.body["expires_in"]);
//         console.log("The access token is " + data.body["access_token"]);

//         // Save the access token so that it's used in future calls
//         spotifyApi.setAccessToken(data.body["access_token"]);
//       },
//       (err) => {
//         console.log(
//           "Something went wrong when retrieving an access token",
//           err.message
//         );
//       }
//     )
//     .then(() => getTrack("The Hot 100", "hot-100", null, spotifyApi));
// }

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
