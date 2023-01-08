const contentfulManagement = require("contentful-management");
const contentful = require("contentful");
const { logger } = require("../../logger/logger");
require("dotenv").config();

const resetAllChartStatuses = async () => {
  // Access to Contentful Delivery API
  const client = contentful.createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  });

  // Access to Contentful Management API
  const managementClient = contentfulManagement.createClient({
    accessToken: process.env.CONTENT_MANAGEMENT_TOKEN,
  });

  return await client
    .getEntries({
      "fields.updatedThisWeek": true,
      content_type: "chart",
    })
    .then(async (res) => {
      const items = res.items;
      if (items) {
        if (items.length > 0) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];

            setTimeout(() => {
              if (item.sys) {
                const itemID = item.sys.id;
                if (itemID) {
                  managementClient
                    .getSpace(process.env.CONTENTFUL_SPACE_ID)
                    .then((space) => {
                      space.getEnvironment("master").then((environment) => {
                        environment.getEntry(itemID).then((entry) => {
                          entry.fields.loopInProgress = {
                            "en-US": false,
                          };

                          entry.fields.updatedThisWeek = {
                            "en-US": false,
                          };

                          entry.fields.loopedThisWeek = {
                            "en-US": false,
                          };

                          entry.update().then(() => {
                            environment
                              .getEntry(itemID)
                              .then((updatedEntry) => {
                                updatedEntry.publish();

                                if (item.fields.name) {
                                  const successStatement = `Entry update was successful! ${item.fields.name} chart's status was reset.`;

                                  if (process.env.NODE_ENV === "production") {
                                    logger("server").info(successStatement);
                                  } else {
                                    console.log(successStatement);
                                  }
                                }
                              });
                          });
                        });
                      });
                    });
                }
              }
            }, i * 20000);
          }
        }
      }
    });
};

module.exports = resetAllChartStatuses;
