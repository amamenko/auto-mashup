const express = require("express");
const app = express();
const cron = require("node-cron");
const exec = require("child_process").exec;
const loopCurrentCharts = require("./functions/search/loopCurrentCharts");
const checkLoopProgress = require("./functions/search/checkLoopProgress");
const loopSongs = require("./functions/search/loopSongs");
const isFirstSundayOfMonth = require("./functions/utils/isFirstSundayOfMonth");
const SpotifyWebApi = require("spotify-web-api-node");
const { format } = require("date-fns");
const { logger } = require("./functions/logger/initializeLogger");
const { onLoggerShutdown } = require("./functions/logger/onLoggerShutdown");
const testSearch = require("./functions/search/testSearch");
require("dotenv").config();

const port = process.env.PORT || 4000;

const spotifyCredentials = {
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
};

const spotifyApi = new SpotifyWebApi(spotifyCredentials);

onLoggerShutdown();

// Run on Tuesdays/Wednesdays starting at noon and then every two minutes until 1 o'clock (for non-GOAT charts)
cron.schedule("0,*/2 12-12 * * 2,3", () => {
  // Get state of previous week's charts
  loopCurrentCharts();
});

// Run every Sunday at midnight, check if it's the first Sunday of the month - if so, update GOAT charts every two minutes until 1 o'clock
cron.schedule("0,*/2 0-0 * * 0", () => {
  if (isFirstSundayOfMonth()) {
    loopCurrentCharts("goat");
  }
});

// Check for or update current loop progression every 30 minutes
cron.schedule("0,30 * * * *", () => {
  checkLoopProgress();
});

// Loop next song position of current in-progress chart (if any) every 5 minutes
cron.schedule("*/5 * * * *", () => {
  // Kill up all leftover Puppeteer processes
  exec("pkill -9 -f puppeteer");

  const currentMinutes = format(Date.now(), "mm");

  if (
    spotifyApi.getAccessToken() &&
    currentMinutes !== "00" &&
    currentMinutes !== "20" &&
    currentMinutes !== "40"
  ) {
    // Clean up cache manually on RAM for AWS
    exec("sync; echo 3 > /proc/sys/vm/drop_caches");

    loopSongs(spotifyApi);
  } else {
    // Retrieve an access token
    spotifyApi
      .clientCredentialsGrant()
      .then(
        (data) => {
          if (process.env.NODE_ENV === "production") {
            logger.log("Retrieved new access token:", {
              indexMeta: true,
              meta: {
                access_token: data.body["access_token"],
              },
            });
          } else {
            console.log(
              "Retrieved new access token: " + data.body["access_token"]
            );
          }

          // Save the access token so that it's used in future calls
          spotifyApi.setAccessToken(data.body["access_token"]);
        },
        (err) => {
          if (process.env.NODE_ENV === "production") {
            logger.error(
              "Something went wrong when retrieving an access token",
              {
                indexMeta: true,
                meta: {
                  message: err.message,
                },
              }
            );
          } else {
            console.error(
              "Something went wrong when retrieving an access token",
              err.message
            );
          }
        }
      )
      .then(() => loopSongs(spotifyApi))
      .catch((error) => {
        if (process.env.NODE_ENV === "production") {
          logger.error(
            "Something went wrong when granting Spotify client credentials.",
            {
              indexMeta: true,
              meta: {
                message: error.message,
              },
            }
          );
        } else {
          console.error(error);
        }

        return;
      });
  }
});

// testSearch("hot-100", 0);

app.listen(port, () => {
  const portStatement = `Listening on port ${port}...`;

  if (process.env.NODE_ENV === "production") {
    logger.log(portStatement);
  } else {
    console.log(portStatement);
  }
});
