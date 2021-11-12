const contentful = require("contentful");
const updateChartLoopInProgress = require("../contentful/updateChartLoopInProgress");
const cleanUpLoopsOnExit = require("../contentful/cleanUpLoopsOnExit");
const addSongPositionValue = require("../contentful/addSongPositionValue");
const getTrack = require("./getTrack");
require("dotenv").config();

const loopSongs = async (spotifyApi, currentYouTubeAPIKey) => {
  if (spotifyApi) {
    // Access to Contentful Delivery API
    const client = contentful.createClient({
      space: process.env.CONTENTFUL_SPACE_ID,
      accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
    });

    await client
      .getEntries({
        "fields.updatedThisWeek": true,
        "fields.loopedThisWeek": false,
        "fields.loopInProgress": true,
        select:
          "fields.name,fields.url,fields.goat,fields.currentSongs,fields.currentLoopPosition",
        content_type: "chart",
      })
      .then(async (res) => {
        if (res) {
          if (res.items) {
            // If a loop is currently marked as "in progress"
            if (res.items[0]) {
              const fields = res.items[0].fields;
              const currentIndex = fields.currentLoopPosition
                ? fields.currentLoopPosition
                : 0;
              const lastChartIndex = fields.currentSongs.length - 1;
              const chartID = res.items[0].sys.id;

              const resolveTrack = () => {
                return getTrack(
                  fields.name,
                  fields.url,
                  fields.currentSongs,
                  fields.goat,
                  spotifyApi,
                  currentIndex,
                  currentYouTubeAPIKey
                );
              };

              resolveTrack();

              const currentChart = {
                name: fields.name,
                id: chartID,
              };

              setTimeout(() => {
                // If last iteration
                if (currentIndex === lastChartIndex) {
                  updateChartLoopInProgress(currentChart, "done");
                } else {
                  addSongPositionValue(chartID, currentIndex);
                }
              }, 240000);
            }
          }
        }
      })
      .catch((err) => {
        console.error(err);
        cleanUpLoopsOnExit();
      });
  } else {
    console.log("No valid Spotify API instance was supplied!");
    return;
  }
};

module.exports = loopSongs;
