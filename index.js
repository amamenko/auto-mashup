const express = require("express");
const app = express();
const SpotifyWebApi = require("spotify-web-api-node");
const getTrack = require("./functions/getTrack");
const searchVideo = require("./functions/usetube/usetubeSearchVideo");
const getVideoSubtitles = require("./functions/usetube/usetubeGetVideoSubtitles");
const getSubtitleJSON = require("./functions/getSubtitleJSON");
const esPkg = require("essentia.js");
const essentia = new esPkg.Essentia(esPkg.EssentiaWASM);
const fs = require("fs");
require("dotenv").config();

const port = process.env.PORT || 4000;

const spotifyCredentials = {
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
};

const spotifyApi = new SpotifyWebApi(spotifyCredentials);

const filePath = "./accompaniment.wav";
const wavFileBuffer = fs.readFileSync(filePath);

// const audioData = wavFileBuffer.getChannelData(0);
// const signal = typedFloat32Array2Vec(audioData);

// compute beat tracking
const computBeatTrackerMultiFeature = (signal) => {
  var ticks = new Module.VectorFloat();
  var confidence = 0;
  essentia.beatTrackerMultiFeature(signal, ticks, confidence);
  var beatTicks = vec2typedFloat32Array(ticks);
  console.log("confidence: ", confidence);
  // bad hack to free the vectors
  ticks.resize(0, 1);
  console.log(beatTicks);
  return beatTicks;
};

// computBeatTrackerMultiFeature(signal);

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
