const contentful = require("contentful");
const updateChartLoopInProgress = require("../contentful/updateChartLoopInProgress");
const { isBefore, parseISO } = require("date-fns");
const cleanUpLoopsOnExit = require("../contentful/cleanUpLoopsOnExit");
require("dotenv").config();

const checkLoopProgress = async () => {
  // Access to Contentful Delivery API
  const client = contentful.createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  });

  // Check if there are any loops in progress
  return await client
    .getEntries({
      "fields.updatedThisWeek": true,
      "fields.loopedThisWeek": false,
      "fields.loopInProgress": true,
      select: "fields.name",
      content_type: "chart",
    })
    .then(async (res) => {
      if (res) {
        if (res.items) {
          // If there's no loop in progress at the moment
          if (res.items.length === 0) {
            return await client
              .getEntries({
                "fields.updatedThisWeek": true,
                "fields.loopedThisWeek": false,
                select: "fields.name",
                content_type: "chart",
              })
              .then(async (res) => {
                if (res) {
                  if (res.items) {
                    if (res.items.length > 0) {
                      const nameArr = res.items.map((item) => {
                        return {
                          name: item.fields.name,
                          id: item.sys.id,
                        };
                      });

                      const firstChart = nameArr[0];

                      if (firstChart) {
                        await updateChartLoopInProgress(
                          firstChart,
                          "in progress"
                        ).catch((err) => {
                          console.error(err);
                          cleanUpLoopsOnExit();
                        });
                      }
                    }
                  }
                }
              })
              .catch((err) => {
                console.error(err);
                cleanUpLoopsOnExit();
              });
          } else {
            // Check if current time is past the expected end time of previous chart loop
            if (res.items[0]) {
              const currentChartEntry = res.items[0];
              const currentChart = {
                name: currentChartEntry.fields.name,
                id: currentChartEntry.sys.id,
              };

              const expectedEnd = currentChartEntry.fields.expectedLoopEnd;

              if (expectedEnd) {
                const currentDate = new Date();
                const parsedEnd = parseISO(expectedEnd);

                const isPastExpected = !isBefore(currentDate, parsedEnd);

                if (isPastExpected) {
                  updateChartLoopInProgress(currentChart, "done");
                }
              }
            }
          }
        }
      }
    })
    .catch((err) => {
      console.error(err);
      cleanUpLoopsOnExit();
    });
};

module.exports = checkLoopProgress;
