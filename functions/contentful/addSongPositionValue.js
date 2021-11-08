const contentfulManagement = require("contentful-management");
require("dotenv").config();

const addSongPositionValue = async (chartID, currentIndex) => {
  // Access to Contentful Management API
  const managementClient = contentfulManagement.createClient({
    accessToken: process.env.CONTENT_MANAGEMENT_TOKEN,
  });

  return await managementClient
    .getSpace(process.env.CONTENTFUL_SPACE_ID)
    .then((space) => {
      space.getEnvironment("master").then((environment) => {
        environment.getEntry(chartID).then((entry) => {
          entry.fields.currentLoopPosition = {
            "en-US": currentIndex + 1,
          };

          entry.update().then(() => {
            environment.getEntry(chartID).then((updatedEntry) => {
              updatedEntry.publish();
            });
          });
        });
      });
    });
};

module.exports = addSongPositionValue;
