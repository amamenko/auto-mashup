const contentful = require("contentful");
const contentfulManagement = require("contentful-management");
const filterOutArr = require("../arrays/filterOutArr");
const getAudioStems = require("../analysis/getAudioStems");
const searchYouTube = require("./searchYouTube");
const updatePreviousEntries = require("../contentful/updatePreviousEntries");
require("dotenv").config();

const getTrack = async (
  currentChartName,
  currentChart,
  currentSongs,
  prevSongs,
  spotifyApi,
  index
) => {
  const topSong = currentSongs[index];
  const songRank = currentSongs[index].rank;
  let songCover = currentSongs[index].cover;

  updatePreviousEntries(topSong, songRank, currentChart, prevSongs);

  // Replace image dimensions to grab larger-sized image URL
  songCover = songCover.replace(/(\d+)x(\d+)/, "155x155");

  // Access to Contentful Delivery API
  const client = contentful.createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  });

  return await client
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
              (item) => item.chartName === currentChartName
            );

            const newChart = {
              chartName: currentChartName,
              chartURL: currentChart,
              rank: songRank,
            };

            const updateContentfulCharts = () => {
              // Access to Contentful Management API
              const managementClient = contentfulManagement.createClient({
                accessToken: process.env.CONTENT_MANAGEMENT_TOKEN,
              });

              managementClient
                .getSpace(process.env.CONTENTFUL_SPACE_ID)
                .then((space) => {
                  space.getEnvironment("master").then((environment) => {
                    environment.getEntry(res.items[0].sys.id).then((entry) => {
                      entry.fields.charts = {
                        "en-US": charts,
                      };
                      entry.update().then(() => {
                        environment
                          .getEntry(res.items[0].sys.id)
                          .then((updatedEntry) => {
                            updatedEntry.publish();

                            console.log(
                              `Entry update was successful and has been published for track "${topSong.title}" by ${topSong.artist}. Its associated charts have been updated to include its new ${currentChartName} rank.`
                            );
                          });
                      });
                    });
                  });

                  return;
                });
            };

            if (containsCurrentChart) {
              if (containsCurrentChart.rank !== songRank) {
                const currentIndex = charts.findIndex(
                  (item) => item.chartName === currentChartName
                );

                if (currentIndex >= 0) {
                  charts[currentIndex] = newChart;

                  updateContentfulCharts();
                }
              } else {
                console.log(
                  `No changes in chart rank this week for "${topSong.title}" by ${topSong.artist}.`
                );
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
            .searchTracks(`track:${topSong.title} artist:${filteredArtist[0]}`)
            .then(
              (data) => {
                if (data) {
                  if (data.body) {
                    if (data.body.tracks) {
                      if (data.body.tracks.items) {
                        if (data.body.tracks.items[0]) {
                          if (data.body.tracks.items[0].id) {
                            const firstResultID = data.body.tracks.items[0].id;
                            return firstResultID;
                          }
                        }
                      }
                    }
                  }
                }
              },
              (err) => {
                console.log("Something went wrong!", err);
              }
            )
            .then((id) => {
              if (id) {
                spotifyApi
                  .getAudioAnalysisForTrack(id)
                  .then(
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
                                console.log(
                                  `No match found for track "${topSong.title}" by ${topSong.artist}.`
                                );
                                return;
                              }
                            } else {
                              console.log(
                                `No match found for track "${topSong.title}" by ${topSong.artist}.`
                              );
                              return;
                            }
                          } else {
                            console.log(
                              `No match found for track "${topSong.title}" by ${topSong.artist}.`
                            );
                            return;
                          }
                        });
                      } else {
                        console.log(
                          `Track "${topSong.title}" by ${topSong.artist} has a time signature that is not 4/4. Moving on to the next track.`
                        );
                        return;
                      }
                    },
                    (err) => {
                      console.log(err);
                      return;
                    }
                  )
                  .catch((error) => {
                    console.log(error);
                    return;
                  });
              } else {
                console.log(
                  `Spotify did not return a song ID for "${topSong.title}" by ${filteredArtist[0]}. Moving on to next song!`
                );
                return;
              }
            });
        }
      }
    })
    .catch((err) => console.log(err));
};

module.exports = getTrack;