const express = require("express");
const app = express();
const SpotifyWebApi = require("spotify-web-api-node");
const getTrack = require("./functions/getTrack");
const { getLyrics } = require("genius-lyrics-api");
const axios = require("axios");
require("dotenv").config();

const port = process.env.PORT || 4000;

const spotifyCredentials = {
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
};

const spotifyApi = new SpotifyWebApi(spotifyCredentials);

const getTrackTimes = async () => {
  const title = "";
  const artist = "";
  // Match non-letter, non-number, non-white-space characters
  const replaceRegex = /[^a-zA-Z\d\s]/gi;

  const options = {
    apiKey: process.env.GENIUS_CLIENT_ACCESS_TOKEN,
    title: title,
    artist: artist,
    optimizeQuery: true,
  };

  getLyrics(options).then((lyrics) => {
    const geniusLyricsArr = [];
    const lyricsSplit = lyrics.split(/[\r\n]+/gi);
    let sectionObj = {};
    let sectionName;
    let sectionLine = -1;

    for (let i = 0; i < lyricsSplit.length; i++) {
      if (lyricsSplit[i].includes("[") && lyricsSplit[i].includes("]")) {
        if (sectionObj["sectionName"]) {
          geniusLyricsArr.push(sectionObj);
          sectionObj = {};
        }
        sectionName = lyricsSplit[i]
          .toLowerCase()
          .replace(replaceRegex, "")
          .trim();
        sectionLine = -1;
        sectionObj["sectionName"] = sectionName;
      } else {
        sectionLine++;
        sectionObj[`line_` + sectionLine] = lyricsSplit[i]
          .toLowerCase()
          .replace(replaceRegex, "")
          .trim();

        if (i === lyricsSplit.length - 1) {
          geniusLyricsArr.push(sectionObj);
        }
      }
    }

    axios
      .get(
        "https://api.textyl.co/api/lyrics?q=" +
          encodeURI(artist.toLowerCase() + " " + title.toLowerCase())
      )
      .then((res) => {
        const textylLyricsArr = res.data;

        const linesPerSection = [
          0,
          ...geniusLyricsArr.map((item) => Object.keys(item).length - 1),
        ];

        let currentLine = 0;

        for (let i = 0; i < linesPerSection.length; i++) {
          currentLine += linesPerSection[i];

          if (textylLyricsArr[currentLine]) {
            geniusLyricsArr[i]["startTime"] =
              textylLyricsArr[currentLine].seconds;
          }
        }
      });
  });
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
