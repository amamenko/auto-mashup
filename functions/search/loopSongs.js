const contentful = require("contentful");
const updateChartLoopInProgress = require("../contentful/updateChartLoopInProgress");
const cleanUpLoopsOnExit = require("../contentful/cleanUpLoopsOnExit");
const addSongPositionValue = require("../contentful/addSongPositionValue");
const getTrack = require("./getTrack");
const { logger } = require("../../logger/logger");
require("dotenv").config();

const loopSongs = async (spotifyApi) => {
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

              if (currentIndex === lastChartIndex) {
                const currentChart = {
                  name: fields.name,
                  id: chartID,
                };

                updateChartLoopInProgress(currentChart, "done");
              } else {
                if (currentIndex !== 0) {
                  addSongPositionValue(chartID, currentIndex);
                }

                const resolveTrack = () => {
                  return getTrack(
                    fields.name,
                    fields.url,
                    fields.currentSongs,
                    fields.goat,
                    spotifyApi,
                    currentIndex
                  );
                };

                resolveTrack();

                setTimeout(() => {
                  if (currentIndex === 0) {
                    addSongPositionValue(chartID, currentIndex);
                  }
                }, 240000);
              }
            }
          }
        }
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "production") {
          logger("server").error(
            `Something went wrong when getting Contentful entries in the 'loopSongs' function: ${err.message}`
          );
        } else {
          console.error(err);
        }

        cleanUpLoopsOnExit();
      });
  } else {
    const notValidStatement =
      "No valid Spotify API instance was supplied to the 'loopSongs' function!";

    if (process.env.NODE_ENV === "production") {
      logger("server").info(notValidStatement);
    } else {
      console.log(notValidStatement);
    }

    return;
  }
};

module.exports = loopSongs;
