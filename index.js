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

        const allFullSectionNames = geniusLyricsArr.map(
          (item) => item.sectionName
        );
        const allSectionNames = geniusLyricsArr.map(
          (item) => item.sectionName.split(" ")[0]
        );

        sectionName = lyricsSplit[i]
          .split(/\[([^\]]+)]/gi)[1]
          .split(/[ [:]+/gi)[0]
          .toLowerCase();

        if (allSectionNames.includes(sectionName)) {
          const newNumberArr = [
            ...new Set(
              allFullSectionNames.filter(
                (item) => item.split(" ")[0] === sectionName
              )
            ),
          ];

          const newNumber = newNumberArr.length + 1;

          sectionName = sectionName + " " + newNumber;
        } else {
          sectionName = sectionName + " 1";
        }

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
        const originalTextylLyricsArr = res.data;

        const newGeniusArr = [];

        for (let i = 0; i < geniusLyricsArr.length; i++) {
          let sectionName = "";
          for (const [key, value] of Object.entries(geniusLyricsArr[i])) {
            if (key === "sectionName") {
              sectionName = value;
            }
            if (key.includes("line")) {
              newGeniusArr.push({
                sectionName: sectionName,
                lineNumber: Number(key.split("_")[1]),
                lyrics: value,
              });
            }
          }
        }

        const matchArr = [];

        let highestIndex = -1;

        const onlyLyricsArr = newGeniusArr.map((item) =>
          item.lyrics.toLowerCase().replace(/[^\w\s]/gi, "")
        );

        const textylLyricsArr = originalTextylLyricsArr
          .map((item) => {
            return {
              seconds: item.seconds,
              lyrics: item.lyrics
                .toLowerCase()
                .replace(/[^\w\s]/gi, "")
                .replace("\r", ""),
            };
          })
          .filter((item) => item.lyrics);

        for (let i = 0; i < textylLyricsArr.length; i++) {
          if (matchArr.length === 0) {
            const match = stringSimilarity.findBestMatch(
              textylLyricsArr[i].lyrics,
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
            let allSections = newGeniusArr
              .map((item) => item.sectionName)
              .filter((item, index, arr) => {
                if (item === arr[index - 1]) {
                  return false;
                } else {
                  return true;
                }
              });

            let allowedIndex = 0;

            for (let j = 0; j < geniusLyricsArr.length; j++) {
              const specificSectionName = geniusLyricsArr[j].sectionName;

              const finalIndex = allSections.findIndex(
                (item) => item === matchArr[matchArr.length - 1].sectionName
              );

              const lastSection = allSections[finalIndex];

              const nextUp = allSections[finalIndex + 1];

              const alreadyMatchedSections = matchArr.map(
                (item) => item.sectionName
              );

              if (specificSectionName === nextUp) {
                if (
                  alreadyMatchedSections[alreadyMatchedSections.length - 1] !==
                  specificSectionName
                ) {
                  const lastApplicableArr = newGeniusArr.filter(
                    (item) => item.sectionName === lastSection
                  );
                  const lastApplicableLyricsArr = lastApplicableArr.map(
                    (item) => item.lyrics.toLowerCase().replace(/[^\w\s]/gi, "")
                  );
                  const onlyApplicableArr = newGeniusArr.filter(
                    (item) => item.sectionName === specificSectionName
                  );
                  const onlyApplicableLyricsArr = onlyApplicableArr.map(
                    (item) => item.lyrics.toLowerCase().replace(/[^\w\s]/gi, "")
                  );

                  const findMatch = (lyricArr) => {
                    if (
                      lyricArr &&
                      lyricArr.length > 0 &&
                      Array.isArray(lyricArr)
                    ) {
                      return stringSimilarity.findBestMatch(
                        textylLyricsArr[i].lyrics,
                        lyricArr
                      );
                    } else {
                      return null;
                    }
                  };

                  const oldLyricMatch = findMatch(lastApplicableLyricsArr);

                  const lyricMatch = findMatch(onlyApplicableLyricsArr);

                  const lyricMatchIndex = onlyApplicableLyricsArr.findIndex(
                    (item) => item.includes(lyricMatch.bestMatch.target)
                  );

                  const matchJSON = {
                    sectionName: nextUp,
                    seconds: textylLyricsArr[i].seconds,
                    lyrics: lyricMatch.bestMatch.target,
                  };

                  if (
                    onlyApplicableArr[lyricMatchIndex].lineNumber ===
                    allowedIndex
                  ) {
                    if (
                      !oldLyricMatch.bestMatch ||
                      oldLyricMatch.bestMatch.rating <=
                        lyricMatch.bestMatch.rating
                    ) {
                      if (lyricMatch.bestMatch.rating >= 0.45) {
                        matchArr.push(matchJSON);
                        break;
                      }
                    }
                  }
                }
              }

              if (j === geniusLyricsArr.length - 1) {
                if (allowedIndex < 3) {
                  j = -1;
                  allowedIndex++;
                  continue;
                }
              }
            }
          }
        }

        // console.log(matchArr);
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
