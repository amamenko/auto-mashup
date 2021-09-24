const contentful = require("contentful");
const contentfulManagement = require("contentful-management");
const { getChart } = require("billboard-top-100");
const { format, startOfWeek, addDays } = require("date-fns");

const loopCurrentCharts = async () => {
  // Access to Contentful Delivery API
  const client = contentful.createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  });

  await client
    .getEntries({
      "fields.updatedThisWeek": false,
      content_type: "chart",
    })
    .then(async (res) => {
      if (res.items) {
        if (res.items[0]) {
          if (res.items[0].fields) {
            const fields = res.items[0].fields;

            const upcomingSaturday = format(
              addDays(
                startOfWeek(new Date(), {
                  weekStartsOn: 6,
                }),
                7
              ),
              "yyyy-MM-dd"
            );

            const lastSaturday = format(
              startOfWeek(new Date(), {
                weekStartsOn: 6,
              }),
              "yyyy-MM-dd"
            );

            getChart(
              fields.url,
              upcomingSaturday,
              async (err, upcomingChart) => {
                if (err) {
                  console.log(err);
                }

                getChart(
                  fields.url,
                  lastSaturday,
                  async (otherErr, previousChart) => {
                    if (otherErr) {
                      console.log(otherErr);
                    }

                    const mapApplicableFields = (list) => {
                      return list.map((item) => {
                        return {
                          rank: item.rank,
                          title: item.title,
                          artist: item.artist,
                          cover: item.cover,
                        };
                      });
                    };

                    const managementClient = contentfulManagement.createClient({
                      accessToken: process.env.CONTENT_MANAGEMENT_TOKEN,
                    });

                    managementClient
                      .getSpace(process.env.CONTENTFUL_SPACE_ID)
                      .then((space) => {
                        space.getEnvironment("master").then((environment) => {
                          environment
                            .getEntry(res.items[0].sys.id)
                            .then((entry) => {
                              if (entry) {
                                if (upcomingChart && previousChart) {
                                  if (
                                    upcomingChart.songs &&
                                    previousChart.songs
                                  ) {
                                    entry.fields.currentSongs = {
                                      "en-US": mapApplicableFields(
                                        upcomingChart.songs
                                      ),
                                    };

                                    entry.fields.previousSongs = {
                                      "en-US": mapApplicableFields(
                                        previousChart.songs
                                      ),
                                    };

                                    entry.fields.date = {
                                      "en-US": upcomingSaturday,
                                    };

                                    entry.fields.updatedThisWeek = {
                                      "en-US": true,
                                    };

                                    entry.update().then(() => {
                                      environment
                                        .getEntry(res.items[0].sys.id)
                                        .then((updatedEntry) => {
                                          updatedEntry.publish();

                                          console.log(
                                            `Chart entry update for ${fields.name} was successful and has been published. Updated current and previous song lists.`
                                          );
                                        });
                                    });
                                  }
                                }
                              }
                            });
                        });
                      });
                  }
                );
              }
            );
          }
        }
      }
    });
};

module.exports = loopCurrentCharts;
