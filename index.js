const express = require("express");
const app = express();
const cron = require("node-cron");
const loopCurrentCharts = require("./functions/search/loopCurrentCharts");
const checkLoopProgress = require("./functions/search/checkLoopProgress");
const cleanUpLoopsOnExit = require("./functions/contentful/cleanUpLoopsOnExit");
const loopSongs = require("./functions/search/loopSongs");
const testSearch = require("./functions/search/testSearch");
const isFirstSundayOfMonth = require("./functions/utils/isFirstSundayOfMonth");
const loopGoatCharts = require("./functions/search/loopGoatCharts");
const findMixable = require("./functions/mix/findMixable");
const timeSectionArr = require("./functions/arrays/timeSectionsArr");
const SpotifyWebApi = require("spotify-web-api-node");
const Youtube = require("youtube-api");
const { format } = require("date-fns");
require("dotenv").config();

const port = process.env.PORT || 4000;

const spotifyCredentials = {
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
};

const spotifyApi = new SpotifyWebApi(spotifyCredentials);

// // Run on Tuesdays/Wednesdays starting at noon and then every two minutes until 1 o'clock (for non-GOAT charts)
cron.schedule("0,*/2 12-12 * * 2,3", () => {
  // Get state of previous week's charts
  loopCurrentCharts();
});

// // Run every Sunday at midnight, check if it's the first Sunday of the month - if so, update GOAT charts
cron.schedule("0 0 * * 0", () => {
  if (isFirstSundayOfMonth()) {
    loopGoatCharts();
  }
});

// // Check for or update current loop progression every 30 minutes
cron.schedule("0,30 * * * *", () => {
  checkLoopProgress();
});

// // Loop next song position of current in-progress chart (if any) every 5 minutes
cron.schedule("*/5 * * * *", () => {
  const currentMinutes = format(Date.now(), "mm");
  const currentMilitaryTime = format(Date.now(), "HH:mm");
  const apiKeyIndex = timeSectionArr.findIndex((arr) =>
    arr.includes(currentMilitaryTime)
  );
  const currentYouTubeAPIKey =
    process.env[`YOUTUBE_CAPTIONS_API_KEY_${apiKeyIndex}`];

  const oauth = Youtube.authenticate({
    type: "oauth",
    client_id: process.env[`YOUTUBE_CAPTIONS_CLIENT_ID_${apiKeyIndex}`],
    client_secret: process.env[`YOUTUBE_CAPTIONS_CLIENT_SECRET_${apiKeyIndex}`],
    redirect_url: process.env.YOUTUBE_REDIRECT_URL,
  });

  const authURL = oauth.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube.force-ssl"],
  });

  oauth.getToken(process.env.YOUTUBE_CAPTIONS_CLIENT_CODE_0, (err, tokens) => {
    if (err) {
      console.error(err);
    }

    console.log("Got the tokens.");

    oauth.setCredentials(tokens);

    console.log({ tokens });
  });

  if (currentYouTubeAPIKey) {
    if (
      spotifyApi.getAccessToken() &&
      currentMinutes !== "00" &&
      currentMinutes !== "20" &&
      currentMinutes !== "40"
    ) {
      loopSongs(spotifyApi, currentYouTubeAPIKey);
    } else {
      // Retrieve an access token
      spotifyApi
        .clientCredentialsGrant()
        .then(
          (data) => {
            console.log(
              "Retrieved new access token: " + data.body["access_token"]
            );

            // Save the access token so that it's used in future calls
            spotifyApi.setAccessToken(data.body["access_token"]);
          },
          (err) => {
            console.log(
              "Something went wrong when retrieving an access token",
              err.message
            );
          }
        )
        .then(() => loopSongs(spotifyApi, currentYouTubeAPIKey))
        .catch((error) => {
          console.log(error);
          return;
        });
    }
  } else {
    console.log("Oops, no YouTube API key is available!");
  }
});

// findMixable();

// testSearch("billboard-global-200", 0);

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
