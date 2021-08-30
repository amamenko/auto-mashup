const express = require("express");
const app = express();
const SpotifyWebApi = require("spotify-web-api-node");
const getTrack = require("./functions/getTrack");
const { listCharts } = require("billboard-top-100");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const lamejs = require("lamejs");
const AudioContext = require("web-audio-api").AudioContext;
const audioCtx = new AudioContext();
const esPkg = require("essentia.js");
const essentia = new esPkg.Essentia(esPkg.EssentiaWASM);
const Blob = require("node-blob");

const port = process.env.PORT || 4000;

const spotifyCredentials = {
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
};

const spotifyApi = new SpotifyWebApi(spotifyCredentials);

// listCharts((err, charts) => {
//   if (err) {
//     console.log(err);
//   } else {
//     const filteredCharts = charts.filter((chart) => {
//       const filterRegex =
//         /(artists*)|(albums*)|(soundtracks*)|(billboard 200)|(social 50)|(jazz)|(gospel)|(christian)|(japan)|(k-pop)|(france)|(germany)|(spain)|(switzerland)|(italy)|(australia)|(argentina)|(tropical)|(regional)|(recurrents)|(bubbling)|(adult)|(excl\.)|(breaker)|(sound)|(triller)|(rhythmic)|(digital)|(lyricfind)|(streaming)/gim;
//       const onlyAllowedRegex =
//         /(hot dance\/electronic songs)|(dance club songs)|(the official u.k. singles chart)|(mexico airplay)|(billboard canadian hot 100)|(hot latin songs)|(holiday 100)|(lyricfind global)|(greatest of all time alternative songs)|(hot alternative songs)|(hot rap songs)|(hot country songs)|(greatest of all time hot country songs)|(hot r&b\/hip-hop songs)|(hot r&b songs)|(greatest of all time hot r&b\/hip-hop songs)|(rock streaming songs)|(hot hard rock songs)|(greatest of all time mainstream rock songs)/gim;
//       const name = chart.name.toLowerCase();

//       if (
//         name.includes("u.k.") ||
//         name.includes("mexico") ||
//         name.includes("canadian") ||
//         name.includes("canada") ||
//         name.includes("latin") ||
//         name.includes("holiday") ||
//         name.includes("alternative") ||
//         name.includes("rap") ||
//         name.includes("country") ||
//         name.includes("r&b") ||
//         name.includes("rock") ||
//         name.includes("dance")
//       ) {
//         return onlyAllowedRegex.test(name) && !filterRegex.test(name);
//       } else {
//         return !filterRegex.test(name);
//       }
//     });

//     console.log({ filteredCharts, length: filteredCharts.length });
//   }
// });

const audioBuffer = fs.readFileSync(
  path.resolve("output/YouTubeAudio", "accompaniment.wav")
);

var mp3Data = [];

const successCallback = (buffer) => {
  const mp3encoder = new lamejs.Mp3Encoder(2, 44100, 128);
  const left = buffer;
  const right = buffer;
  const sampleBlockSize = 1152;
  for (let i = 0; i < buffer.length; i += sampleBlockSize) {
    leftChunk = left.subarray(i, i + sampleBlockSize);
    rightChunk = right.subarray(i, i + sampleBlockSize);
    let mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }
  mp3buf = mp3encoder.flush(); //finish writing mp3
  if (mp3buf.length > 0) {
    mp3Data.push(mp3buf);
  }
  const fullLength = mp3Data.map((item) => item.byteLength);
  console.log({
    fullLength: fullLength.reduce((a, b) => a + b) / 1000000.0,
  });

  var blob = new Blob(mp3Data, { type: "audio/mp3" });
  console.log({
    blob,
    blobSize: blob.size,
  });
  // var url = window.URL.createObjectURL(blob);
  // console.log("MP3 URl: ", url);
};
// successCallback(audioBuffer);

const whatever = async () => {
  await audioCtx.decodeAudioData(audioBuffer, successCallback, (e) =>
    console.log("Error with decoding audio data" + e.err)
  );
};

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
