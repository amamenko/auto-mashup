const getSubtitleJSON = require("./getSubtitleJSON");
const removeAccents = require("remove-accents");
const {
  filterArray,
  descriptionFilterArray,
  channelAboutFilterArray,
} = require("../arrays/videoFilterArr");
const getEachArtist = require("./getEachArtist");
const timeStampToSeconds = require("../utils/timeStampToSeconds");
const getChannelDescription = require("./getChannelDescription");
const getVideoDescription = require("./getVideoDescription");
const { logger } = require("../logger/initializeLogger");
require("dotenv").config();

const filterVideoResults = async (videos, trackTitle, trackArtist) => {
  const { artist1, artist2, artist3 } = getEachArtist(trackArtist);
  const artistArr = [artist1, artist2, artist3]
    .filter((item) => item)
    .map((item) => item.toLowerCase());

  const withinParantheses = /\(([^)]+)\)/gim;

  const formattedTrackTitle = removeAccents(trackTitle).toLowerCase();
  const formattedTrackArtist = removeAccents(trackArtist).toLowerCase();
  const trackTitleWithoutAlias = formattedTrackTitle
    .replace(withinParantheses, "")
    .trim();

  const filteredVids = videos.filter((video) => {
    const formattedVideoTitle = removeAccents(
      video.original_title.toLowerCase()
    );

    const viewsMinimum = video.relativePublishedTime
      ? video.relativePublishedTime.toLowerCase().includes("years")
        ? Number(video.relativePublishedTime.split(" ")[0]) * 500
        : 500
      : 500;

    return (
      !filterArray.some((item) =>
        item instanceof RegExp
          ? item.test(formattedVideoTitle)
          : !formattedTrackTitle.includes(item) &&
            !formattedTrackArtist.includes(item)
          ? formattedVideoTitle.includes(item)
          : false
      ) &&
      formattedVideoTitle.includes(trackTitleWithoutAlias) &&
      artistArr.some((artist) => formattedVideoTitle.includes(artist)) &&
      video.duration >= 80 &&
      video.duration <= 360 &&
      video.views >= viewsMinimum
    );
  });

  if (filteredVids.length > 0) {
    const firstFour = filteredVids.slice(0, 4);

    const loopOverVideos = async () => {
      const allResultsArr = [];

      const promiseArray = [];

      for (let i = 0; i < firstFour.length; i++) {
        const delayedTimeoutPromise = async (delay) => {
          return new Promise((resolve, reject) => {
            const gettingStatement = `Getting subtitles for video ${i + 1} of ${
              firstFour.length
            }: ${firstFour[i].original_title}`;

            setTimeout(async () => {
              if (process.env.NODE_ENV === "production") {
                logger.log(gettingStatement);
              } else {
                console.log(gettingStatement);
              }

              if (firstFour[i].channel_name) {
                let channelDescription = await getChannelDescription(
                  firstFour[i]
                ).catch((err) => {
                  if (process.env.NODE_ENV === "production") {
                    logger.error(
                      `Something went wrong when getting channel description for YouTube video with title "${firstFour[i].original_title}".`,
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
                });

                if (
                  channelDescription &&
                  typeof channelDescription === "string"
                ) {
                  channelDescription = channelDescription.toLowerCase();

                  if (
                    channelAboutFilterArray.some((item) => {
                      if (item instanceof RegExp) {
                        if (
                          !item.test(formattedTrackTitle) &&
                          !item.test(formattedTrackArtist)
                        ) {
                          return item.test(channelDescription);
                        } else {
                          return false;
                        }
                      } else {
                        if (
                          !formattedTrackTitle.includes(item) &&
                          !formattedTrackArtist.includes(item)
                        ) {
                          return channelDescription.includes(item);
                        } else {
                          return false;
                        }
                      }
                    })
                  ) {
                    const coverChannelStatement = `The channel for this video (${firstFour[i].channel_name}) appears to be a cover channel. Moving on to next available video!`;

                    if (process.env.NODE_ENV === "production") {
                      logger.log(coverChannelStatement);
                    } else {
                      console.log(coverChannelStatement);
                    }

                    resolve();
                    return;
                  }
                }
              }

              let videoDescription = await getVideoDescription(
                firstFour[i].id
              ).catch((err) => {
                if (process.env.NODE_ENV === "production") {
                  logger.error(
                    `Something went wrong when getting the video description for YouTube video with ID "${firstFour[i].id}"`,
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
              });

              const videoTitle = removeAccents(
                firstFour[i].original_title
              ).toLowerCase();

              if (
                videoDescription &&
                typeof videoDescription === "string" &&
                !videoDescription.includes("official music video") &&
                !videoDescription.includes("official video") &&
                !videoTitle.includes("official music video") &&
                !videoTitle.includes("official video")
              ) {
                videoDescription = videoDescription.toLowerCase();

                if (
                  descriptionFilterArray.some((item) => {
                    if (item instanceof RegExp) {
                      if (
                        !item.test(formattedTrackTitle) &&
                        !item.test(formattedTrackArtist)
                      ) {
                        return item.test(videoDescription);
                      } else {
                        return false;
                      }
                    } else {
                      if (
                        !formattedTrackTitle.includes(item) &&
                        !formattedTrackArtist.includes(item)
                      ) {
                        return videoDescription.includes(item);
                      } else {
                        return false;
                      }
                    }
                  })
                ) {
                  const coverStatement = `The description for this video (https://www.youtube.com/watch?v=${firstFour[i].id}) appears to indicate that it is a cover or live performance. Moving on to next available video!`;

                  if (process.env.NODE_ENV === "production") {
                    logger.log(coverStatement);
                  } else {
                    console.log(coverStatement);
                  }
                  resolve();
                  return;
                }
              }

              return await getSubtitleJSON(
                firstFour[i].id,
                firstFour[i].original_title,
                firstFour[i].duration,
                trackTitle,
                trackArtist
              )
                .then((lyricsObj) => {
                  if (lyricsObj) {
                    const expectedArr = lyricsObj.expectedLyricArr;
                    const arr = lyricsObj.lyricArr;

                    const videoTitle = removeAccents(
                      firstFour[i].original_title
                    ).toLowerCase();

                    let artistMatches = 0;

                    for (const artist of artistArr) {
                      if (videoTitle.includes(artist)) {
                        artistMatches++;
                      }
                    }

                    if (arr) {
                      let ditch = 0;
                      let repeatedMisses = 0;

                      for (let j = 0; j < arr.length; j++) {
                        const section = arr[j];
                        const nextSection = arr[j + 1];

                        if (
                          section &&
                          section.start &&
                          nextSection &&
                          nextSection.start
                        ) {
                          const start = timeStampToSeconds(section.start);
                          const end = timeStampToSeconds(nextSection.start);

                          if (end - start <= 9) {
                            repeatedMisses++;

                            if (repeatedMisses >= 2) {
                              ditch += 2;
                            }
                          }

                          if (end - start >= 120) {
                            ditch += 2;
                          }
                        }
                      }

                      const result = {
                        id: firstFour[i].id,
                        videoTitle,
                        artistMatches,
                        ditchResult: ditch >= 2 ? true : false,
                        duration: firstFour[i].duration,
                        views: firstFour[i].views,
                        arr,
                        arrLength: arr.length,
                        expectedArr,
                      };
                      allResultsArr.push(result);

                      resolve(result);
                      return result;
                    } else {
                      reject();
                      return;
                    }
                  } else {
                    resolve();
                    return;
                  }
                })
                .catch((err) => {
                  const subtitleErrorStatement =
                    "Subtitle function resulted in an error!";

                  if (process.env.NODE_ENV === "production") {
                    logger.error(subtitleErrorStatement, {
                      indexMeta: true,
                      meta: {
                        message: err.message,
                      },
                    });
                  } else {
                    console.log(subtitleErrorStatement);
                    console.error(err);
                  }

                  reject();
                  return;
                });
            }, delay);
          });
        };

        promiseArray.push(delayedTimeoutPromise(i * 15000));
      }

      // Waits for all Promise objects to resolve
      // Bypasses Promise.all's behavior of rejecting immediately upon any of the input promises rejecting
      // Instead resolves all Promise objects with errors to null in the resulting array
      return Promise.all(promiseArray.map((p) => p.catch((error) => null)))
        .then((arr) => {
          const allResolvedStatement = "All promises of Promise.all resolved!";

          if (process.env.NODE_ENV === "production") {
            logger.log(allResolvedStatement);
          } else {
            console.log(allResolvedStatement);
          }
          return arr;
        })
        .catch((err) => {
          const errorStatement = "Error in iterable promises of Promise.all";

          if (process.env.NODE_ENV === "production") {
            logger.error(errorStatement, {
              indexMeta: true,
              meta: {
                message: err.message,
              },
            });
          } else {
            console.log(errorStatement);
            console.error(err);
          }
        });
    };

    return await loopOverVideos().then((arr) => {
      if (arr) {
        if (Array.isArray(arr) && arr.length > 0) {
          let existenceArr = arr.filter((item) => item);

          let withRemix = 0;
          let withoutRemix = 0;

          for (const el of existenceArr) {
            if (removeAccents(el.videoTitle).toLowerCase().includes("remix")) {
              withRemix++;
            } else {
              withoutRemix++;
            }
          }

          if (withRemix > withoutRemix) {
            existenceArr = existenceArr.filter(
              (item) => !item.videoTitle.includes("remix")
            );
          }

          const allArtistMatches = existenceArr.map((item) =>
            item.artistMatches ? item.artistMatches : 0
          );

          const highestArtistMatch = Math.max(...allArtistMatches);

          existenceArr = existenceArr.filter(
            (item) => item.artistMatches === highestArtistMatch
          );

          const allResultLengths = existenceArr.map((item) =>
            item.arrLength ? item.arrLength : 0
          );

          const bestMatch = existenceArr.find(
            (item) =>
              item.arrLength === Math.max(...allResultLengths) &&
              !item.ditchResult
          );

          return bestMatch;
        } else {
          return;
        }
      }
    });
  } else {
    return;
  }
};

module.exports = filterVideoResults;
