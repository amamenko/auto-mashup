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
const AudioContext = require("web-audio-api").AudioContext;
global.fetch = require("node-fetch");
const path = require("path");
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
require("dotenv").config();

const port = process.env.PORT || 4000;

const spotifyCredentials = {
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
};

const spotifyApi = new SpotifyWebApi(spotifyCredentials);

const filePath = "http://localhost:4000/audio";
const audioCtx = new AudioContext();

const getData = () => {
  audioCtx.decodeAudioData(
    filePath,
    (buffer) => {
      console.log(buffer);
      return buffer;
    },
    (e) => console.log("Error with decoding audio data" + e.err)
  );

  // Convert the JS float32 typed array into std::vector<float>
  // const inputSignalVector = essentia.arrayToVector(buffer.getChannelData(0));
};

getData();

//   console.log(audioBuffer);
//   // Convert the JS float32 typed array into std::vector<float>
//   // const inputSignalVector = essentia.arrayToVector(
//   //   audioBuffer.getChannelData(0)
//   // );
//   // const beats = essentia.BeatTrackerMultiFeature(inputSignalVector);
//   // console.log(beats);
// };

// getAudioBuffer();

app.get("/audio", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "audio/wav",
  });

  fs.createReadStream(filePath).pipe(res);
});

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
