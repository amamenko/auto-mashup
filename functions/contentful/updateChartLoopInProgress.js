const contentfulManagement = require("contentful-management");
require("dotenv").config();

const updateChartLoopInProgress = async (chart, state) => {
  // Access to Contentful Management API
  const managementClient = contentfulManagement.createClient({
    accessToken: process.env.CONTENT_MANAGEMENT_TOKEN,
  });

  return await managementClient
    .getSpace(process.env.CONTENTFUL_SPACE_ID)
    .then((space) => {
      space.getEnvironment("master").then((environment) => {
        environment.getEntry(chart.id).then((entry) => {
          entry.fields.loopInProgress = {
            "en-US": state === "in progress" ? true : false,
          };
          entry.update().then(() => {
            console.log(
              `Entry update was successful! ${
                chart.name
              } chart loop marked as ${
                state === "in progress" ? "in progress." : "done."
              }`
            );
          });
        });
      });

      return;
    });
};

module.exports = updateChartLoopInProgress;
