const getSubtitleJSON = require("./getSubtitleJSON");
const removeAccents = require("remove-accents");
const { filterArray, mustContainArray } = require("../arrays/videoFilterArr");
const getEachArtist = require("./getEachArtist");
const timeStampToSeconds = require("../utils/timeStampToSeconds");
const getChannelDescription = require("./getChannelDescription");
const getVideoDescription = require("./getVideoDescription");

const filterVideoResults = async (videos, trackTitle, trackArtist) => {
  const { artist1, artist2, artist3 } = getEachArtist(trackArtist);
  const artistArr = [artist1, artist2, artist3]
    .filter((item) => item)
    .map((item) => item.toLowerCase());

  const withinParantheses = /\(([^)]+)\)/gim;

  const filteredVids = videos.filter((video) => {
    const formattedVideoTitle = removeAccents(
      video.original_title.toLowerCase()
    );
    const formattedTrackTitle = removeAccents(trackTitle).toLowerCase();
    const trackTitleWithoutAlias = formattedTrackTitle
      .replace(withinParantheses, "")
      .trim();

    return (
      !filterArray.some((item) =>
        item instanceof RegExp
          ? item.test(formattedVideoTitle)
          : formattedVideoTitle.includes(item)
      ) &&
      mustContainArray.some((word) => formattedVideoTitle.includes(word)) &&
      formattedVideoTitle.includes(trackTitleWithoutAlias) &&
      artistArr.some((artist) => formattedVideoTitle.includes(artist)) &&
      video.duration > 60 &&
      video.duration < 660 &&
      video.views >= 1000
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
            setTimeout(async () => {
              console.log(
                `Getting subtitles for video ${i + 1} of ${firstFour.length}: ${
                  firstFour[i].original_title
                }`
              );

              const filterOutDesc = [
                "cover",
                "karaoke",
                "acapella",
                "parody",
                "version",
              ];

              if (firstFour[i].channel_name) {
                let channelDescription = await getChannelDescription(
                  firstFour[i]
                ).catch((e) => console.error(e));

                if (
                  channelDescription &&
                  typeof channelDescription === "string"
                ) {
                  channelDescription = channelDescription.toLowerCase();

                  if (
                    filterOutDesc.some((item) =>
                      channelDescription.includes(item)
                    )
                  ) {
                    console.log(
                      `The channel for this video (${firstFour[i].channel_name}) appears to be a cover channel. Moving on to next available video!`
                    );
                    resolve();
                    return;
                  }
                }
              }

              let videoDescription = await getVideoDescription(
                firstFour[i].id
              ).catch((e) => console.error(e));

              if (videoDescription && typeof videoDescription === "string") {
                videoDescription = videoDescription.toLowerCase();

                if (
                  filterOutDesc.some((item) => videoDescription.includes(item))
                ) {
                  console.log(
                    `The description for this video (https://www.youtube.com/watch?v=${firstFour[i].id}) appears to indicate that it is a cover. Moving on to next available video!`
                  );
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
                        } else {
                          if (nextSection) {
                            const currentSectionStart = timeStampToSeconds(
                              section.start
                            );
                            const nextSectionStart = timeStampToSeconds(
                              nextSection.start
                            );

                            if (nextSectionStart - currentSectionStart >= 120) {
                              ditch += 2;
                            }
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
                  console.log("Subtitle function resulted in an error!");
                  console.log(err);
                  reject();
                  return;
                });
            }, delay);
          });
        };

        promiseArray.push(delayedTimeoutPromise(i * 30000));
      }

      // Waits for all Promise objects to resolve
      // Bypasses Promise.all's behavior of rejecting immediately upon any of the input promises rejecting
      // Instead resolves all Promise objects with errors to null in the resulting array
      return Promise.all(promiseArray.map((p) => p.catch((error) => null)))
        .then((arr) => {
          console.log("All promises of Promise.all resolved!");
          return arr;
        })
        .catch((err) => {
          console.log("Error in iterable promises of Promise.all");
          console.log(err);
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
