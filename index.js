const express = require("express");
const app = express();
const SpotifyWebApi = require("spotify-web-api-node");
const getTrack = require("./functions/getTrack");
const { getLyrics } = require("genius-lyrics-api");
const axios = require("axios");
const stringSimilarity = require("string-similarity");
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
        sectionName = lyricsSplit[i];
        sectionLine = -1;
        sectionObj["sectionName"] = sectionName;
      } else {
        sectionLine++;
        sectionObj[`line_` + sectionLine] = lyricsSplit[i];

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

        const newGeniusArr = [];

        for (let i = 0; i < geniusLyricsArr.length; i++) {
          let sectionName = "";
          for (const [key, value] of Object.entries(geniusLyricsArr[i])) {
            if (key === "sectionName") {
              sectionName = value;
            } else {
              if (key.includes("line")) {
                newGeniusArr.push({
                  sectionName: sectionName,
                  lineNumber: Number(key.split("_")[1]),
                  lyrics: value,
                });
              }
            }
          }
        }

        const matchArr = [];

        let highestIndex = -1;

        const sectionArr = newGeniusArr.map((item) => item.sectionName);
        const onlyLyricsArr = newGeniusArr.map((item) =>
          item.lyrics.toLowerCase().replace(/[^\w\s]/gi, "")
        );

        for (let i = 0; i < textylLyricsArr.length; i++) {
          if (matchArr.length === 0) {
            const match = stringSimilarity.findBestMatch(
              textylLyricsArr[i].lyrics.toLowerCase().replace(/[^\w\s]/gi, ""),
              onlyLyricsArr
            ).bestMatch;

            const matchIndex = onlyLyricsArr.findIndex(
              (item, index) => index >= highestIndex && item === match.target
            );

            if (matchIndex >= 0) {
              highestIndex = matchIndex;
            }

            const firstMatch = newGeniusArr[matchIndex];

            matchArr.push({
              sectionName: firstMatch.sectionName,
              seconds: textylLyricsArr[i].seconds,
              lyrics: match.target,
            });
          } else {
            let allSections = [
              ...new Set(newGeniusArr.map((item) => item.sectionName)),
            ];

            for (let j = 0; j < geniusLyricsArr.length; j++) {
              const specificSectionName = geniusLyricsArr[j].sectionName;

              const nextUp =
                allSections[
                  allSections.findIndex(
                    (item) => item === matchArr[matchArr.length - 1].sectionName
                  ) + 1
                ];

              if (specificSectionName === nextUp) {
                if (
                  !matchArr
                    .map((item) => item.sectionName)
                    .includes(specificSectionName)
                ) {
                  const onlyApplicableArr = newGeniusArr.filter(
                    (item) => item.sectionName === specificSectionName
                  );
                  const onlyApplicableLyricsArr = onlyApplicableArr.map(
                    (item) => item.lyrics.replace(/[^\w\s]/gi, "")
                  );

                  const lyricMatch = stringSimilarity.findBestMatch(
                    textylLyricsArr[i].lyrics
                      .toLowerCase()
                      .replace(/[^\w\s]/gi, ""),
                    onlyApplicableLyricsArr
                  ).bestMatch;

                  const lyricMatchIndex = onlyApplicableLyricsArr.findIndex(
                    (item) => item === lyricMatch.target
                  );

                  if (onlyApplicableArr[lyricMatchIndex].lineNumber === 0) {
                    if (lyricMatch.rating > 0.7) {
                      if (
                        !matchArr
                          .map((item) => item.sectionName)
                          .includes(specificSectionName) &&
                        matchArr.map(
                          (item) => item.sectionName.split(/[[\s+:()]+/gi)[1]
                        )[matchArr.length - 1] !==
                          specificSectionName.split(/[[\s+:()]+/gi)[1]
                      ) {
                        matchArr.push({
                          sectionName: nextUp,
                          seconds: textylLyricsArr[i].seconds,
                          lyrics: lyricMatch.target,
                        });
                        break;
                      }
                    }
                  }
                }
              }
            }
          }
        }

        console.log(matchArr);
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
