const contentful = require("contentful");
const contentfulManagement = require("contentful-management");

const updatePreviousEntries = (topSong, songRank, currentChart, prevSongs) => {
  if (prevSongs) {
    const prevSongSameRank = prevSongs.find((item) => item.rank === songRank);

    if (prevSongSameRank) {
      // If the previous week's track was different (same chart, same rank)
      if (
        topSong.title !== prevSongSameRank.title ||
        topSong.artist !== prevSongSameRank.artist
      ) {
        // Access to Contentful Delivery API
        const client = contentful.createClient({
          space: process.env.CONTENTFUL_SPACE_ID,
          accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
        });

        client
          .getEntries({
            "fields.title": prevSongSameRank.title,
            "fields.artist": prevSongSameRank.artist,
            content_type: "song",
          })
          .then(async (res) => {
            if (res.items) {
              if (res.items[0]) {
                if (res.items[0].fields) {
                  const charts = res.items[0].fields.charts;

                  const containsCurrentChart = charts.find(
                    (item) => item.chart === currentChart
                  );

                  const indexCurrentChart = charts.findIndex(
                    (item) => item.chart === currentChart
                  );

                  if (containsCurrentChart) {
                    if (indexCurrentChart >= 0) {
                      // Access to Contentful Management API
                      const managementClient =
                        contentfulManagement.createClient({
                          accessToken: process.env.CONTENT_MANAGEMENT_TOKEN,
                        });

                      if (res.items[0].sys) {
                        const entryID = res.items[0].sys.id;
                        if (entryID) {
                          managementClient
                            .getSpace(process.env.CONTENTFUL_SPACE_ID)
                            .then((space) => {
                              space
                                .getEnvironment("master")
                                .then((environment) => {
                                  environment
                                    .getEntry(entryID)
                                    .then((entry) => {
                                      // If entry appears on more charts
                                      // -> leave entry, just update charts it appears on
                                      if (charts.length > 0) {
                                        charts.splice(indexCurrentChart, 1);
                                        entry.fields.charts = charts;
                                        entry.update().then(() => {
                                          environment
                                            .getEntry(entryID)
                                            .then((updatedEntry) => {
                                              updatedEntry.publish();

                                              console.log(
                                                "Song entry updated successfully and published."
                                              );
                                            });
                                        });
                                      } else {
                                        // If entry does NOT appear in any other charts
                                        // -> delete entry
                                        entry
                                          .delete()
                                          .then(() =>
                                            console.log("Entry deleted.")
                                          )
                                          .catch(console.error);
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
          });
      }
    }
  }
};

module.exports = updatePreviousEntries;
