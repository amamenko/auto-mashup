const contentful = require("contentful");
const updateChartLoopInProgress = require("../contentful/updateChartLoopInProgress");
const { isBefore, parseISO, getDay } = require("date-fns");
const cleanUpLoopsOnExit = require("../contentful/cleanUpLoopsOnExit");
const { logger } = require("../logger/initializeLogger");
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
                order: "fields.goat",
                select: "fields.name,fields.goat",
                content_type: "chart",
              })
              .then(async (res) => {
                if (res) {
                  if (res.items) {
                    if (res.items.length > 0) {
                      const nameArr = res.items.map((item) => {
                        return {
                          name: item.fields.name,
                          goat: item.fields.goat,
                          id: item.sys.id,
                        };
                      });

                      const firstChart = nameArr[0];

                      if (firstChart) {
                        const isGoat = firstChart.goat;

                        const currentDay = getDay(new Date());

                        if (currentDay === 3 && isGoat) {
                          const goatLoopStatement =
                            "Not starting any GOAT loops on Wednesday!";

                          if (process.env.NODE_ENV === "production") {
                            logger.log(goatLoopStatement);
                          } else {
                            console.log(goatLoopStatement);
                          }
                        } else {
                          await updateChartLoopInProgress(
                            firstChart,
                            "in progress"
                          ).catch((err) => {
                            if (process.env.NODE_ENV === "production") {
                              logger.error(
                                "Error updating chart to 'in progress' within checkLoopProgress function!",
                                {
                                  indexMeta: true,
                                  meta: {
                                    message: err.message,
                                  },
                                }
                              );
                            } else {
                              console.error(err);
                            }
                            cleanUpLoopsOnExit();
                          });
                        }
                      }
                    }
                  }
                }
              })
              .catch((err) => {
                if (process.env.NODE_ENV === "production") {
                  logger.error(
                    "Error getting Contentful chart entries within checkLoopProgress function!",
                    {
                      indexMeta: true,
                      meta: {
                        message: err.message,
                      },
                    }
                  );
                } else {
                  console.error(err);
                }
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
      if (process.env.NODE_ENV === "production") {
        logger.error(
          "Error getting Contentful chart loops in progress within checkLoopProgress function!",
          {
            indexMeta: true,
            meta: {
              message: err.message,
            },
          }
        );
      } else {
        console.error(err);
      }
      cleanUpLoopsOnExit();
    });
};

module.exports = checkLoopProgress;
