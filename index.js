const express = require("express");
const app = express();
const cron = require("node-cron");
const loopCurrentCharts = require("./functions/search/loopCurrentCharts");
const loopSongs = require("./functions/search/loopSongs");
require("dotenv").config();

const port = process.env.PORT || 4000;

// Run on Wednesdays starting at 11:00 PM and every second minute after until midnight
cron.schedule("0,*/2 23 * * 3", () => {
  // Get state of previous week's charts
  loopCurrentCharts();
});

// Run every 30 minutes starting at midnight on Thursday until Saturday at 11:30 PM
// cron.schedule("0,30 0-23 * * 4-6", () => {
//   loopSongs();
// });

cron.schedule("0,30 0-23 * * *", () => {
  loopSongs();
});

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
