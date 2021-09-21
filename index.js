const express = require("express");
const app = express();
const cron = require("node-cron");
const loopCharts = require("./functions/search/loopCharts");
const loopSongs = require("./functions/search/loopSongs");
require("dotenv").config();

const port = process.env.PORT || 4000;

// Run on Wednesdays at 11:00 PM
cron.schedule("0 23 * * 3", () => {
  // Get state of current charts
  loopCharts("current");
});

// Run on Wednesdays at 11:30 PM
cron.schedule("30 23 * * 3", () => {
  // Get state of previous week's charts
  loopCharts("previous");
});

// Run every 30 minutes starting at midnight on Thursday until Saturday at 11:30 PM
cron.schedule("0,30 0-23 * * 4-6", () => {
  loopSongs();
});

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
