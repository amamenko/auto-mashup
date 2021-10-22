const express = require("express");
const app = express();
const cron = require("node-cron");
const cleanUpLoopsOnExit = require("./functions/contentful/cleanUpLoopsOnExit");
const mixTracks = require("./functions/mix/mixTracks");
const loopCurrentCharts = require("./functions/search/loopCurrentCharts");
const loopSongs = require("./functions/search/loopSongs");
const nodeCleanup = require("node-cleanup");
const testSearch = require("./functions/search/testSearch");
const resetAllChartStatuses = require("./functions/contentful/resetAllChartStatuses");
const findMixable = require("./functions/mix/findMixable");
const ffmpeg = require("fluent-ffmpeg");
require("dotenv").config();

const port = process.env.PORT || 4001;

// Just in case, reset all chart statuses on Mondays at midnight
cron.schedule("0 * * * 1", () => {
  resetAllChartStatuses();
});

// // Run on Tuesdays/Wednesdays starting at noon and then every two minutes until 1 o'clock
cron.schedule("0,*/2 12-13 * * 2,3", () => {
  // Get state of previous week's charts
  loopCurrentCharts();
});

// // Run every 30 minutes starting at midnight on Wednesday until Saturday at 11:30 PM
cron.schedule("0,30 0-23 * * 3-6", () => {
  loopSongs();
});

// findMixable();

// mixTracks();

// testSearch("billboard-global-200", 0);

// nodeCleanup((exitCode, signal) => {
//   cleanUpLoopsOnExit(exitCode, signal);
//   nodeCleanup.uninstall(); // Unregister the nodeCleanup handler.
//   return false;
// });

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
