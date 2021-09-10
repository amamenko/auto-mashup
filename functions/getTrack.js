const { getChart } = require("billboard-top-100");
const getAudioStems = require("./getAudioStems");
const searchYouTube = require("./searchYouTube");
const filterOutArr = require("./arrays/filterOutArr");
const contentful = require("contentful");
const contentfulManagement = require("contentful-management");

const getTrack = (currentChartName, currentChart, spotifyApi) => {
  getChart(currentChart, async (err, chart) => {
    if (err) {
      console.log(err);
    } else {
      const topSong = chart.songs[0];
      const songRank = chart.songs[0].rank;
      let songCover = chart.songs[0].cover;

      // Replace image dimensions to grab larger-sized image URL
      songCover = songCover.replace(/(\d+)x(\d+)/, "155x155");

      const client = contentful.createClient({
        space: process.env.CONTENTFUL_SPACE_ID,
        accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
      });

      client
        .getEntries({
          "fields.title": topSong.title,
          "fields.artist": topSong.artist,
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

                const newChart = { chart: currentChart, rank: songRank };

                const updateContentfulCharts = () => {
                  const managementClient = contentfulManagement.createClient({
                    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
                  });

                  managementClient
                    .getSpace(process.env.CONTENTFUL_SPACE_ID)
                    .then((space) => {
                      space.getEnvironment("master").then((environment) => {
                        environment
                          .getEntry(res.items[0].sys.id)
                          .then((entry) => {
                            entry.fields.charts = charts;
                            entry.update().then(() => {
                              console.log("Entry update was successful!");
                            });
                          });
                      });

                      return;
                    });
                };

                if (containsCurrentChart) {
                  if (containsCurrentChart.rank !== songRank) {
                    const currentIndex = charts.findIndex(
                      (item) => item.chart === currentChart
                    );

                    if (currentIndex >= 0) {
                      charts[currentIndex] = newChart;

                      updateContentfulCharts();
                    }
                  } else {
                    return;
                  }
                } else {
                  charts.push(newChart);

                  updateContentfulCharts();
                }
              }
            } else {
              const splitRegex =
                /(\()|(\))|(, )|( with )|(featuring)|(ft\.)|(&)|x(?!( &)|( and )|( featuring)|( feat\.)|( ft\.)|$)|(feat\.)|( and )/gi;

              const filteredArtist = topSong.artist
                .split(splitRegex)
                .filter(
                  (item) =>
                    item && !filterOutArr.includes(item.trim().toLowerCase())
                )
                .map((item) => item.trim());

              return await spotifyApi
                .searchTracks(
                  `track:${topSong.title} artist:${filteredArtist[0]}`
                )
                .then(
                  (data) => {
                    const firstResultID = data.body.tracks.items[0].id;
                    return firstResultID;
                  },
                  (err) => {
                    console.log("Something went wrong!", err);
                  }
                )
                .then((id) => {
                  spotifyApi.getAudioAnalysisForTrack(id).then(
                    async (data) => {
                      const allKeys = [
                        "C",
                        "C#",
                        "D",
                        "D#",
                        "E",
                        "F",
                        "F#",
                        "G",
                        "G#",
                        "A",
                        "A#",
                        "B",
                      ];
                      const trackDetails = data.body.track;

                      const tempo = trackDetails.tempo;
                      const key = allKeys[trackDetails.key];
                      const mode = trackDetails.mode === 1 ? "major" : "minor";

                      const trackDataJSON = {
                        title: topSong.title,
                        artist: topSong.artist,
                        rank: songRank,
                        cover: songCover,
                        tempo,
                        key,
                        mode,
                        currentChart,
                        currentChartName,
                      };

                      if (trackDetails.time_signature === 4) {
                        return await searchYouTube(
                          topSong.title,
                          topSong.artist
                        ).then((match) => {
                          if (match) {
                            if (match.arr) {
                              if (match.arr.length >= 4) {
                                const matchID = match.id;
                                const matchDuration = match.duration;
                                const matchArr = match.arr.map((item) => {
                                  if (item.end) {
                                    return {
                                      sectionName: item.sectionName,
                                      start: item.start,
                                      end: item.end,
                                    };
                                  } else {
                                    return {
                                      sectionName: item.sectionName,
                                      start: item.start,
                                    };
                                  }
                                });
                                getAudioStems(
                                  matchID,
                                  matchDuration,
                                  matchArr,
                                  trackDataJSON
                                );
                              } else {
                                return;
                              }
                            }
                          } else {
                            console.log("No match found");
                          }
                        });
                      } else {
                        console.log(
                          "This song has a time signature that is not 4/4. Moving on to the next track."
                        );
                        return;
                      }
                    },
                    (err) => {
                      done(err);
                    }
                  );
                });
            }
          }
        })
        .catch((err) => console.log(err));
    }
  });
};

module.exports = getTrack;
