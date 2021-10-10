const express = require("express");
const app = express();
const cron = require("node-cron");
const cleanUpLoopsOnExit = require("./functions/contentful/cleanUpLoopsOnExit");
const mixTracks = require("./functions/mix/mixTracks");
const loopCurrentCharts = require("./functions/search/loopCurrentCharts");
const loopSongs = require("./functions/search/loopSongs");
// const { getChart } = require("billboard-top-100");
// const SpotifyWebApi = require("spotify-web-api-node");
// const contentful = require("contentful");
// const getTrack = require("./functions/search/getTrack");
const nodeCleanup = require("node-cleanup");
require("dotenv").config();

const port = process.env.PORT || 4001;

// // Run on Wednesdays starting at 11:00 PM and every second minute after until midnight
// cron.schedule("0,*/2 23 * * 3", () => {
//   // Get state of previous week's charts
//   loopCurrentCharts();
// });

// Run every 30 minutes starting at midnight on Thursday until Saturday at 11:30 PM
// cron.schedule("0,30 0-23 * * 4-6", () => {
//   loopSongs();
// });

// mixTracks();

// cron.schedule("0,30 0-23 * * *", () => {
//   loopSongs();
// });

// For future tests
// getChart("", async (err, chart) => {
//   if (err) {
//     console.log(err);
//   }

//   const songs = chart.songs;

//   const client = contentful.createClient({
//     space: process.env.CONTENTFUL_SPACE_ID,
//     accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
//   });

//   // Check if there are any loops in progress
//   await client
//     .getEntries({
//       "fields.url": "",
//       content_type: "chart",
//     })
//     .then(async (res) => {
//       if (res) {
//         if (res.items) {
//           client.getEntry(res.items[0].sys.id).then(async (entry) => {
//             const spotifyCredentials = {
//               clientId: process.env.SPOTIFY_CLIENT_ID,
//               clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
//             };

//             const spotifyApi = new SpotifyWebApi(spotifyCredentials);

//             const fields = entry.fields;

//             const resolveTrack = (index) => {
//               return getTrack(
//                 fields.name,
//                 fields.url,
//                 fields.currentSongs,
//                 fields.previousSongs,
//                 spotifyApi,
//                 2
//               );
//             };

//             const getCredentialsFirst = async (index) => {
//               // Retrieve an access token
//               return spotifyApi
//                 .clientCredentialsGrant()
//                 .then(
//                   (data) => {
//                     console.log(
//                       "Retrieved new access token: " + data.body["access_token"]
//                     );

//                     // Save the access token so that it's used in future calls
//                     spotifyApi.setAccessToken(data.body["access_token"]);
//                   },
//                   (err) => {
//                     console.log(
//                       "Something went wrong when retrieving an access token",
//                       err.message
//                     );
//                   }
//                 )
//                 .then(async () => await resolveTrack(index))
//                 .catch((error) => {
//                   console.log(error);
//                   return;
//                 });
//             };

//             getCredentialsFirst(2);
//           });
//         }
//       }
//     });
// });

nodeCleanup((exitCode, signal) => {
  if (signal) {
    cleanUpLoopsOnExit(exitCode, signal);
    nodeCleanup.uninstall(); // Unregister the nodeCleanup handler.
    return false;
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
