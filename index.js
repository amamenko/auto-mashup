const express = require("express");
const app = express();
const cron = require("node-cron");
const cleanUpLoopsOnExit = require("./functions/contentful/cleanUpLoopsOnExit");
const mixTracks = require("./functions/mix/mixTracks");
const loopCurrentCharts = require("./functions/search/loopCurrentCharts");
const loopSongs = require("./functions/search/loopSongs");
const nodeCleanup = require("node-cleanup");
const testSearch = require("./functions/search/testSearch");
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

// testSearch("billboard-global-200", 0);

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
