const contentful = require("contentful");
const contentfulManagement = require("contentful-management");
const { getChart } = require("../billboard/getChart");
const { format, startOfWeek, addDays } = require("date-fns");
const deepEqual = require("deep-equal");

const loopCurrentCharts = async () => {
  // Access to Contentful Delivery API
  const client = contentful.createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  });

  await client
    .getEntries({
      "fields.updatedThisWeek": false,
      "fields.goat": false,
      content_type: "chart",
    })
    .then(async (res) => {
      if (res.items) {
        if (res.items[0]) {
          if (res.items[0].fields) {
            const fields = res.items[0].fields;

            getChart(fields.url, async (err, upcomingChart) => {
              if (err) {
                console.log(err);
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

              if (upcomingChart) {
                if (upcomingChart.songs) {
                  const queriedSongs = mapApplicableFields(upcomingChart.songs);

                  const mapSameFormat = (item) => {
                    return {
                      rank: item.rank,
                      title: item.title,
                      artist: item.artist,
                    };
                  };

                  const original = fields.currentSongs.map(mapSameFormat);
                  const current = queriedSongs.map(mapSameFormat);

                  const changed = !deepEqual(original, current);

                  const managementClient = contentfulManagement.createClient({
                    accessToken: process.env.CONTENT_MANAGEMENT_TOKEN,
                  });

                  const mostRecentSaturday = fields.date;

                  managementClient
                    .getSpace(process.env.CONTENTFUL_SPACE_ID)
                    .then((space) => {
                      space.getEnvironment("master").then((environment) => {
                        environment
                          .getEntry(res.items[0].sys.id)
                          .then((entry) => {
                            if (entry) {
                              const upcomingSaturday = format(
                                addDays(
                                  startOfWeek(new Date(), {
                                    weekStartsOn: 6,
                                  }),
                                  7
                                ),
                                "yyyy-MM-dd"
                              );

                              if (mostRecentSaturday !== upcomingSaturday) {
                                if (changed) {
                                  entry.fields.currentSongs = {
                                    "en-US": queriedSongs,
                                  };
                                }

                                entry.fields.date = {
                                  "en-US": upcomingSaturday,
                                };

                                entry.fields.updatedThisWeek = {
                                  "en-US": true,
                                };

                                entry.fields.loopedThisWeek = {
                                  "en-US": false,
                                };

                                entry.fields.loopInProgress = {
                                  "en-US": false,
                                };

                                entry
                                  .update()
                                  .then(() => {
                                    environment
                                      .getEntry(res.items[0].sys.id)
                                      .then((updatedEntry) => {
                                        updatedEntry.publish();

                                        console.log(
                                          `Chart entry update for ${fields.name} was successful and has been published. Updated current song list.`
                                        );
                                      });
                                  })
                                  .catch((e) => {
                                    console.error(e);
                                  });
                              }
                            }
                          });
                      });
                    })
                    .catch((e) => {
                      console.error(e);
                    });
                }
              }
            });
          }
        }
      }
    })
    .catch((e) => {
      console.error(e);
    });
};

module.exports = loopCurrentCharts;
