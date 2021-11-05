const contentfulManagement = require("contentful-management");
const { addMinutes } = require("date-fns");
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

          // Loop expected to end in n number of songs times 5 minutes each
          const expectedEndDate = addMinutes(
            new Date(),
            entry.fields.currentSongs["en-US"].length * 5
          );

          entry.fields.expectedLoopEnd = {
            "en-US":
              state === "in progress" ? expectedEndDate.toISOString() : "",
          };

          if (state === "done") {
            entry.fields.updatedThisWeek = {
              "en-US": false,
            };

            entry.fields.loopedThisWeek = {
              "en-US": true,
            };
          }
          entry.update().then(() => {
            environment.getEntry(chart.id).then((updatedEntry) => {
              updatedEntry.publish();

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
      });

      return;
    });
};

module.exports = updateChartLoopInProgress;
