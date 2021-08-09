const express = require("express");
const app = express();
const SpotifyWebApi = require("spotify-web-api-node");
const getTrack = require("./functions/getTrack");
const { getLyrics, searchSong } = require("genius-lyrics-api");
const axios = require("axios");
const stringSimilarity = require("string-similarity");
const getLyricTimestamps = require("./functions/getLyricTimestamps");
require("dotenv").config();

const port = process.env.PORT || 4000;

const spotifyCredentials = {
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
};

const spotifyApi = new SpotifyWebApi(spotifyCredentials);

const getTrackTimes = async () => {
  let title = "";
  const artist = "";

  const options = {
    apiKey: process.env.GENIUS_CLIENT_ACCESS_TOKEN,
    originalTitle: title,
    title: title,
    artist: artist,
  };

  searchSong(options)
    .then(async (res) => {
      if (res) {
        if (res.length > 0) {
          const artistArr = artist
            .split(/\s+/)
            .map((item) => item.toLowerCase());

          const resultArr = res.filter((item) => {
            const currentTitleArr = item.title.toLowerCase().split(/\s+/);

            if (
              currentTitleArr.some((item) => artistArr.includes(item)) &&
              !currentTitleArr.includes("spotify")
            ) {
              return true;
            }
          });

          if (resultArr[0]) {
            const titleRegex = /(\s{1}by\s{1})(?!.*\1)/gi;

            const newTitleArr = resultArr[0].title.split(titleRegex);

            if (title !== newTitleArr[0].trim()) {
              options.title = newTitleArr[0].trim();
            }

            await getLyricTimestamps(options).then(async (lyricArr) => {
              if (lyricArr.length <= 4) {
                if (resultArr[1]) {
                  const newOptions = {
                    ...options,
                    title: resultArr[1].title.split(titleRegex)[0].trim(),
                  };

                  await getLyricTimestamps(newOptions).then((newLyricArr) => {
                    if (newLyricArr.length > lyricArr.length) {
                      console.log(newLyricArr);
                    } else {
                      console.log(lyricArr);
                    }
                  });
                } else {
                  console.log(lyricArr);
                }
              } else {
                console.log(lyricArr);
              }
            });
          }
        }
      }
    })
    .catch((err) => console.log(err));
};

getTrackTimes();

// if (spotifyApi.getAccessToken()) {
//   getTrack(spotifyApi);
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
//     .then(() => getTrack(spotifyApi));
// }

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
