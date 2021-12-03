const fs = require("fs");
const contentful = require("contentful");
const contentfulManagement = require("contentful-management");
const filterOutArr = require("../arrays/filterOutArr");
const getAudioInputSource = require("../analysis/getAudioInputSource");
const searchYouTube = require("./searchYouTube");
const updatePreviousEntries = require("../contentful/updatePreviousEntries");
const checkFileExists = require("../utils/checkFileExists");
const { logger } = require("../logger/initializeLogger");
const timeStampToSeconds = require("../utils/timeStampToSeconds");
const secondsToTimestamp = require("../utils/secondsToTimestamp");
require("dotenv").config();

const getTrack = async (
  currentChartName,
  currentChart,
  currentSongs,
  goat,
  spotifyApi,
  index
) => {
  const topSong = currentSongs[index];
  const songRank = currentSongs[index].rank;
  let songCover = currentSongs[index].cover;

  updatePreviousEntries(topSong, songRank, currentChart, goat, currentSongs);

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
              (item) => item && item.chartName === currentChartName
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
                      const allChartNames = charts.map((item) =>
                        item.chartName.toLowerCase()
                      );

                      const regNames = allChartNames.filter(
                        (item) =>
                          !item.includes("greatest") &&
                          !item.includes("goat") &&
                          !item.includes("80s") &&
                          !item.includes("90s")
                      );

                      const goatNames = allChartNames.filter(
                        (item) =>
                          item.includes("greatest") ||
                          item.includes("goat") ||
                          item.includes("80s") ||
                          item.includes("90s")
                      );

                      const regExists = regNames.length > 0;
                      const goatExists = goatNames.length > 0;

                      if (goatExists) {
                        if (regExists) {
                          entry.fields.goat = {
                            "en-US": "both",
                          };
                        } else {
                          entry.fields.goat = {
                            "en-US": "yes",
                          };
                        }
                      } else {
                        entry.fields.goat = {
                          "en-US": "no",
                        };
                      }

                      entry.fields.charts = {
                        "en-US": charts,
                      };

                      entry.update().then(() => {
                        environment
                          .getEntry(res.items[0].sys.id)
                          .then((updatedEntry) => {
                            updatedEntry.publish();

                            const logStatement = `Entry update was successful and has been published for track "${topSong.title}" by ${topSong.artist}. Its associated charts have been updated to include its new ${currentChartName} rank.`;

                            if (process.env.NODE_ENV === "production") {
                              logger.log(logStatement);
                            } else {
                              console.log(logStatement);
                            }
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
                const noChangesStatement = `No changes in chart rank this week for "${topSong.title}" by ${topSong.artist}.`;

                if (process.env.NODE_ENV === "production") {
                  logger.log(noChangesStatement);
                } else {
                  console.log(noChangesStatement);
                }

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
                if (process.env.NODE_ENV === "production") {
                  logger.error("Something went wrong when searching Spotify!", {
                    indexMeta: true,
                    meta: {
                      message: err.message,
                    },
                  });
                } else {
                  console.log(
                    "Something went wrong when searching Spotify!",
                    err
                  );
                }
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
                        goat,
                      };

                      if (trackDetails.time_signature === 4) {
                        return await searchYouTube(
                          topSong.title,
                          topSong.artist
                        ).then(async (match) => {
                          const noMatchFoundStatement = `No match found for track "${topSong.title}" by ${topSong.artist}.`;

                          if (match) {
                            if (match.arr) {
                              if (match.arr.length >= 4) {
                                const matchID = match.id;
                                const matchTitle = match.videoTitle;
                                const matchDuration = match.duration;
                                const matchExpected = match.expectedArr;
                                const matchArr = match.arr
                                  .map((item) => {
                                    return {
                                      sectionName: item.sectionName,
                                      start: item.start,
                                    };
                                  })
                                  .filter(
                                    (item) => item.sectionName !== "intro 1"
                                  );

                                const firstSectionStart = timeStampToSeconds(
                                  matchArr[0].start
                                );

                                let audioStart =
                                  firstSectionStart - 5 >= 0
                                    ? firstSectionStart - 5
                                    : firstSectionStart;

                                // Cut off of audio will be at 2 minute and 10 second mark, at most
                                const audioEnd = audioStart + 130;

                                // Update new array timestamps to match trimmed audio
                                const filteredMatchArr = matchArr
                                  .filter(
                                    (item) =>
                                      timeStampToSeconds(item.start) + 5 <=
                                      audioEnd
                                  )
                                  .map((item) => {
                                    let startTime = 0;

                                    if (firstSectionStart - 5 >= 0) {
                                      startTime = secondsToTimestamp(
                                        timeStampToSeconds(item.start) - 5
                                      );
                                    } else {
                                      startTime = secondsToTimestamp(
                                        timeStampToSeconds(item.start) -
                                          firstSectionStart
                                      );
                                    }

                                    return {
                                      sectionName: item.sectionName,
                                      start: startTime,
                                    };
                                  });

                                const youtubeAudioFileExists =
                                  await checkFileExists("YouTubeAudio.mp3");

                                const youtubeTrimmedAudioFileExists =
                                  await checkFileExists(
                                    "YouTubeAudioTrimmed.mp3"
                                  );

                                const runAudioAnalysis = async () => {
                                  // Clean up leftover audio input just in case
                                  if (youtubeAudioFileExists) {
                                    fs.rmSync("YouTubeAudio.mp3", {
                                      recursive: true,
                                      force: true,
                                    });
                                  }

                                  // Clean up leftover trimmed audio input just in case
                                  if (youtubeTrimmedAudioFileExists) {
                                    fs.rmSync("YouTubeAudioTrimmed.mp3", {
                                      recursive: true,
                                      force: true,
                                    });
                                  }

                                  await getAudioInputSource(
                                    audioStart,
                                    matchID,
                                    matchTitle,
                                    matchDuration,
                                    matchExpected,
                                    filteredMatchArr,
                                    trackDataJSON
                                  ).catch((err) => {
                                    if (process.env.NODE_ENV === "production") {
                                      logger.error(
                                        "Something went wrong when running audio analysis!",
                                        {
                                          indexMeta: true,
                                          meta: {
                                            message: err.message,
                                          },
                                        }
                                      );
                                    } else {
                                      console.error(err);
                                    }

                                    if (youtubeAudioFileExists) {
                                      fs.rmSync("YouTubeAudio.mp3", {
                                        recursive: true,
                                        force: true,
                                      });
                                    }
                                    return;
                                  });
                                };

                                if (
                                  youtubeAudioFileExists ||
                                  youtubeTrimmedAudioFileExists
                                ) {
                                  const stillRunningStatement = `Whoops, a different song loop is still running! Delaying for one minute and then analyzing audio for track "${topSong.title}" by ${topSong.artist}.`;
                                  if (process.env.NODE_ENV === "production") {
                                    logger.log(stillRunningStatement);
                                  } else {
                                    console.log(stillRunningStatement);
                                  }

                                  setTimeout(() => runAudioAnalysis(), 60000);
                                } else {
                                  runAudioAnalysis();
                                }
                              } else {
                                if (process.env.NODE_ENV === "production") {
                                  logger.error(noMatchFoundStatement);
                                } else {
                                  console.log(noMatchFoundStatement);
                                }

                                return;
                              }
                            } else {
                              if (process.env.NODE_ENV === "production") {
                                logger.error(noMatchFoundStatement);
                              } else {
                                console.log(noMatchFoundStatement);
                              }

                              return;
                            }
                          } else {
                            if (process.env.NODE_ENV === "production") {
                              logger.error(noMatchFoundStatement);
                            } else {
                              console.log(noMatchFoundStatement);
                            }

                            return;
                          }
                        });
                      } else {
                        const not4ErrorStatement = `Track "${topSong.title}" by ${topSong.artist} has a time signature that is not 4/4. Moving on to the next track.`;

                        if (process.env.NODE_ENV === "production") {
                          logger.log(not4ErrorStatement);
                        } else {
                          console.log(not4ErrorStatement);
                        }
                        return;
                      }
                    },
                    (err) => {
                      if (process.env.NODE_ENV === "production") {
                        logger.error(
                          `Something went wrong after fetching Spotify's audio analysis for "${topSong.title}" by ${filteredArtist[0]}.`,
                          {
                            indexMeta: true,
                            meta: {
                              message: err.message,
                            },
                          }
                        );
                      } else {
                        console.error(err);
                      }
                      return;
                    }
                  )
                  .catch((err) => {
                    if (process.env.NODE_ENV === "production") {
                      logger.error(
                        `Something went wrong when fetching Spotify's audio analysis for "${topSong.title}" by ${filteredArtist[0]}.`,
                        {
                          indexMeta: true,
                          meta: {
                            message: err.message,
                          },
                        }
                      );
                    } else {
                      console.error(err);
                    }

                    return;
                  });
              } else {
                const noSongIDStatement = `Spotify did not return a song ID for "${topSong.title}" by ${filteredArtist[0]}. Moving on to next song!`;

                if (process.env.NODE_ENV === "production") {
                  logger.log(noSongIDStatement);
                } else {
                  console.log(noSongIDStatement);
                }
                return;
              }
            });
        }
      }
    })
    .catch((err) => console.log(err));
};

module.exports = getTrack;
