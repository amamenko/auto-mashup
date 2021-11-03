const process = require("process");
const contentful = require("contentful");
const contentfulManagement = require("contentful-management");
require("dotenv").config();

const cleanUpLoopsOnExit = async (signal) => {
  // Access to Contentful Delivery API
  const client = contentful.createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  });

  // Check if there are any loops in progress
  return await client
    .getEntries({
      "fields.loopedThisWeek": false,
      "fields.loopInProgress": true,
      select: "fields.name",
      content_type: "chart",
    })
    .then(async (res) => {
      if (res) {
        if (res.items) {
          // If there's a loop in progress at the moment
          if (res.items.length > 0) {
            // Access to Contentful Management API
            const managementClient = contentfulManagement.createClient({
              accessToken: process.env.CONTENT_MANAGEMENT_TOKEN,
            });

            const chartInProgress = res.items[0];

            if (chartInProgress) {
              if (chartInProgress.sys.id) {
                return await managementClient
                  .getSpace(process.env.CONTENTFUL_SPACE_ID)
                  .then(async (space) => {
                    return await space
                      .getEnvironment("master")
                      .then(async (environment) => {
                        return await environment
                          .getEntry(res.items[0].sys.id)
                          .then(async (entry) => {
                            entry.fields.loopInProgress = {
                              "en-US": false,
                            };

                            entry.fields.updatedThisWeek = {
                              "en-US": false,
                            };

                            entry.fields.loopedThisWeek = {
                              "en-US": true,
                            };

                            return await entry.update().then(() => {
                              environment
                                .getEntry(res.items[0].sys.id)
                                .then((updatedEntry) => {
                                  updatedEntry.publish().then(() => {
                                    console.log(
                                      `Server killed. Songs loop for chart ${entry.fields.name} no longer in progress.`
                                    );
                                    if (signal) {
                                      process.kill(process.pid, signal);
                                    }
                                    return;
                                  });

                                  return;
                                });
                              return;
                            });
                          });
                      });
                  });
              }
            }
          }
        }
      }
      console.log("Server killed. No song loops happening at the moment.");
      if (signal) {
        process.kill(process.pid, signal);
      }
      return;
    })
    .catch((err) => {
      console.log(err);
      return err;
    });
};

module.exports = cleanUpLoopsOnExit;
