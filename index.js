const express = require("express");
const app = express();
const SpotifyWebApi = require("spotify-web-api-node");
const getTrack = require("./functions/getTrack");
const { getLyrics, searchSong } = require("genius-lyrics-api");
const stringSimilarity = require("string-similarity");
const getLyricTimestamps = require("./functions/getLyricTimestamps");
const { getSubtitles } = require("youtube-captions-scraper");
const ytdl = require("ytdl-core");
const https = require("https");
const fs = require("fs");
const path = require("path");
const subsrt = require("subsrt");
const searchVideo = require("./functions/usetube/usetubeSearchVideo");
const getVideoSubtitles = require("./functions/usetube/usetubeGetVideoSubtitles");
require("dotenv").config();

const port = process.env.PORT || 4000;

const spotifyCredentials = {
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
};

const spotifyApi = new SpotifyWebApi(spotifyCredentials);

const getTrackTimes = async (youtubeCaptions) => {
  let title = "";
  const artist = "";

  const options = {
    apiKey: process.env.GENIUS_CLIENT_ACCESS_TOKEN,
    originalTitle: title,
    title: title,
    artist: artist,
    youtubeCaptions,
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
              if (lyricArr) {
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
              }
            });
          }
        }
      }
    })
    .catch((err) => console.log(err));
};

// getTrackTimes();

// let videoID = "";

// const format = "vtt";
// const lang = "en";

// ytdl.getInfo(videoID).then((info) => {
//   const tracks =
//     info.player_response.captions.playerCaptionsTracklistRenderer.captionTracks;

//   if (tracks && tracks.length) {
//     console.log(
//       "Found captions for",
//       tracks.map((t) => t.name.simpleText).join(", ")
//     );

//     const track = tracks.find((t) => t.languageCode === lang);

//     if (track) {
//       console.log("Retrieving captions:", track.name.simpleText);
//       console.log("URL", track.baseUrl);

//       const output = `YouTubeSubtitles.${format}`;

//       console.log("Saving to", output);

//       const pathOfFile = path.resolve(__dirname, output);

//       https.get(
//         `${track.baseUrl}&fmt=${format !== "xml" ? format : ""}`,
//         (res) => {
//           res.pipe(fs.createWriteStream(pathOfFile)).on("finish", () => {
//             const vttSubtitles = fs.readFileSync(pathOfFile, "utf8");

//             // Convert .vtt to .json
//             const newJSONFile = subsrt.convert(vttSubtitles, {
//               format: "json",
//             });

//             const parsedJSON = JSON.parse(newJSONFile);

//             if (parsedJSON) {
//               if (parsedJSON.length > 0) {
//                 const subtitleData = parsedJSON[0].data;
//                 const subtitleArr = subtitleData.split("\n\n");

//                 const lyricsArr = [];

//                 for (let i = 0; i < subtitleArr.length; i++) {
//                   const currentItem = subtitleArr[i];
//                   const currentSections = currentItem.split("\n");
//                   const timeSplit = currentSections[0].split(" --> ");
//                   const newLyrics = currentSections
//                     .slice(1)
//                     .join(" ")
//                     .toLowerCase()
//                     .replace(/(^|\s)♪($|\s)/gi, "");

//                   if (currentItem[0] === "0") {
//                     if (/\d|[A-z]/.test(newLyrics)) {
//                       lyricsArr.push({
//                         start: timeSplit[0],
//                         end: timeSplit[1],
//                         lyrics: newLyrics,
//                       });
//                     }
//                   }
//                 }

//                 getTrackTimes(lyricsArr);
//               }
//             }
//           });
//         }
//       );
//     } else {
//       console.log("Could not find captions for", lang);
//     }
//   } else {
//     console.log("No captions found for this video");
//   }
// });

// const getVideo = async () => {
//   await searchVideo("").then(async (results) => {
//     if (results) {
//       if (results.videos) {
//         if (results.videos.length > 0) {
//           const allResultsArr = results.videos;

// for (let i = 0; i < allResultsArr.length; i++) {
//   await getVideoSubtitles(allResultsArr[i].id)
//     .then((subtitles) => {
//       if (subtitles) {
//         const filteredArr = subtitles.filter((item) => {
//           if (
//             item.segs &&
//             item.segs.every((value) => !value.acAsrConf)
//           ) {
//             return true;
//           }
//         });

//         const justLyrics = filteredArr
//           .map((item) => item.segs[0].utf8)
//           .filter(
//             (item) =>
//               item !== "\n" &&
//               item !== "[Music]" &&
//               item !== "[Applause]"
//           );

//         if (justLyrics.length > 0) {
//           console.log(justLyrics);
//           return justLyrics;
//         }
//       }
//     })
//     .catch((err) => {
//       console.log(err.message);
//       return;
//     });
// }
//         } else {
//           console.log("No results found!");
//         }
//       }
//     }
//   });
// };

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
