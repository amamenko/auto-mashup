const contentful = require("contentful");
const contentfulManagement = require("contentful-management");
require("dotenv").config();

const updatePreviousEntries = async (topSong, songRank, currentChart, goat) => {
  // Access to Contentful Delivery API
  const client = contentful.createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  });

  return await client
    .getEntries({
      "fields.goat": goat ? "yes" || "both" : "no",
      content_type: "song",
      limit: 1000,
    })
    .then(async (res) => {
      if (res.items) {
        const matchedEntry = res.items.find((item) =>
          item.fields.charts.find(
            (chart) =>
              chart.chartURL === currentChart && chart.rank === songRank
          )
        );

        if (matchedEntry) {
          if (matchedEntry.fields) {
            const fields = matchedEntry.fields;

            const title = topSong.title;
            const artist = topSong.artist;

            // If old match does not have the same ranking now
            if (fields.title !== title || fields.artist !== artist) {
              const charts = fields.charts;

              const containsCurrentChart = charts.find(
                (item) => item.chartURL === currentChart
              );

              const indexCurrentChart = charts.findIndex(
                (item) => item.chartURL === currentChart
              );

              if (containsCurrentChart) {
                if (indexCurrentChart >= 0) {
                  // Access to Contentful Management API
                  const managementClient = contentfulManagement.createClient({
                    accessToken: process.env.CONTENT_MANAGEMENT_TOKEN,
                  });

                  if (matchedEntry.sys) {
                    const entryID = matchedEntry.sys.id;
                    if (entryID) {
                      managementClient
                        .getSpace(process.env.CONTENTFUL_SPACE_ID)
                        .then((space) => {
                          space.getEnvironment("master").then((environment) => {
                            environment.getEntry(entryID).then((entry) => {
                              charts.splice(indexCurrentChart, 1);
                              // If entry appears on more charts
                              // -> leave entry, just update charts it appears on
                              if (charts.length > 0) {
                                entry.fields.charts = charts;
                                entry.update().then(() => {
                                  environment
                                    .getEntry(entryID)
                                    .then((updatedEntry) => {
                                      updatedEntry.publish();

                                      console.log(
                                        `The charts field for the track "${fields.title}" by ${fields.artist} has been updated successfully and published.`
                                      );
                                    });
                                });
                              } else {
                                // If entry does NOT appear in any other charts
                                // -> delete entry assets and entry itself
                                if (fields) {
                                  const accompaniment = fields.accompaniment;
                                  const vocals = fields.vocals;

                                  const accompanimentID = accompaniment.sys.id;
                                  const vocalsID = vocals.sys.id;

                                  // Delete accompaniment asset
                                  if (accompanimentID) {
                                    environment
                                      .getAsset(accompanimentID)
                                      .then((accompanimentAsset) => {
                                        accompanimentAsset
                                          .delete()
                                          .then(() => {
                                            console.log(
                                              `Accompaniment asset for track "${fields.title}" by ${fields.artist} has been deleted.`
                                            );
                                            return;
                                          })
                                          .catch(console.error);
                                      });
                                  }

                                  // Delete vocals asset
                                  if (vocalsID) {
                                    environment
                                      .getAsset(vocalsID)
                                      .then((vocalsAsset) => {
                                        vocalsAsset
                                          .delete()
                                          .then(() => {
                                            console.log(
                                              `Vocals asset for track "${fields.title}" by ${fields.artist} has been deleted.`
                                            );
                                            return;
                                          })
                                          .catch(console.error);
                                      });
                                  }

                                  // Delete entry itself
                                  entry
                                    .delete()
                                    .then(() => {
                                      console.log(
                                        `Entry for track "${fields.title}" by ${fields.artist} has been deleted.`
                                      );
                                      return;
                                    })
                                    .catch(console.error);
                                }
                              }
                            });
                          });
                        });
                    }
                  }
                }
              }
            }
          }
        }
      }
    })
    .catch((e) => {
      console.error(e);
      return;
    });
};

module.exports = updatePreviousEntries;
