const express = require("express");
const app = express();
const cron = require("node-cron");
const loopCharts = require("./functions/search/loopCharts");
const loopSongs = require("./functions/search/loopSongs");
require("dotenv").config();

const port = process.env.PORT || 4000;

// Run on Thursdays at midnight (00:00)
cron.schedule("0 0 * * 4", () => {
  // Get state of current charts
  loopCharts("current");
});

// Run on Thursdays at 00:30
cron.schedule("30 0 * * 4", () => {
  // Get state of previous week's charts
  loopCharts("previous");
});

loopSongs();

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
