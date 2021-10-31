const express = require("express");
const app = express();
const cron = require("node-cron");
const mixTracks = require("./functions/mix/mixTracks");
const loopCurrentCharts = require("./functions/search/loopCurrentCharts");
const loopSongs = require("./functions/search/loopSongs");
const nodeCleanup = require("node-cleanup");
const cleanUpLoopsOnExit = require("./functions/contentful/cleanUpLoopsOnExit");
const testSearch = require("./functions/search/testSearch");
const isFirstSundayOfMonth = require("./functions/utils/isFirstSundayOfMonth");
const loopGoatCharts = require("./functions/search/loopGoatCharts");
const findMixable = require("./functions/mix/findMixable");
const getSubtitleJSON = require("./functions/search/getSubtitleJSON");
require("dotenv").config();

const port = process.env.PORT || 4001;

const lyricsSplit = [""];

const bracketRegex = /\[|\]/gim;
const sectionArr = lyricsSplit.filter(
  (lyric) => lyric.includes("[") && lyric.includes("]")
);

const getSection = (str) => {
  return str.replace(bracketRegex, "").toLowerCase().split(" ")[0];
};

const repeats = [];

for (let j = 0; j < sectionArr.length; j++) {
  const current = getSection(sectionArr[j]);

  const mostRecentMatch = repeats.find(
    (item) => item.split(" ")[0] === current
  );

  if (mostRecentMatch) {
    repeats.push(current + " " + (Number(mostRecentMatch.split(" ")[1]) + 1));
  } else {
    repeats.push(current + " 1");
  }
}

console.log(repeats);

// for (let i = 0; i < lyricsSplit.length; i++) {
//   if (lyricsSplit[i].includes("[") && lyricsSplit[i].includes("]")) {
//     if (sectionObj["sectionName"]) {
//       geniusLyricsArr.push(sectionObj);
//       sectionObj = {};
//     }
//   }
// }

// Run on Tuesdays/Wednesdays starting at noon and then every two minutes until 1 o'clock (for non-GOAT charts)
// cron.schedule("0,*/2 12-12 * * 2,3", () => {
//   // Get state of previous week's charts
//   loopCurrentCharts();
// });

// Run every Sunday at midnight, check if it's the first Sunday of the month - if so, update GOAT charts
// cron.schedule("0 0 * * 0", () => {
//   if (isFirstSundayOfMonth()) {
//     loopGoatCharts();
//   }
// });

// Check for any updated songs every 30 minutes
// cron.schedule("0,30 * * * *", () => {
//   loopSongs();
// });

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
