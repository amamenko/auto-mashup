const getSubtitleJSON = require("./getSubtitleJSON");
const removeAccents = require("remove-accents");
const { filterArray, mustContainArray } = require("../arrays/videoFilterArr");
const getEachArtist = require("./getEachArtist");

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
      video.duration < 660
    );
  });

  if (filteredVids.length > 0) {
    const firstFive = filteredVids.slice(0, 5);

    const loopOverVideos = async () => {
      const allResultsArr = [];

      const promiseArray = [];

      for (let i = 0; i < firstFive.length; i++) {
        const delayedTimeoutPromise = async (delay) => {
          return new Promise((resolve, reject) => {
            setTimeout(async () => {
              console.log(
                `Getting subtitles for video ${i + 1} of ${firstFive.length}: ${
                  firstFive[i].original_title
                }`
              );

              return await getSubtitleJSON(
                firstFive[i].id,
                firstFive[i].original_title,
                firstFive[i].duration,
                trackTitle,
                trackArtist
              )
                .then((arr) => {
                  const videoTitle = removeAccents(
                    firstFive[i].original_title
                  ).toLowerCase();
                  let artistMatches = 0;

                  for (const artist of artistArr) {
                    if (videoTitle.includes(artist)) {
                      artistMatches++;
                    }
                  }

                  if (arr) {
                    let ditch = 0;

                    for (const section of arr) {
                      const getSeconds = (timestamp) => {
                        const timeArr = timestamp
                          .split(":")
                          .map((item) => Number(item));

                        let totalSeconds = 0;

                        totalSeconds += timeArr[0] * 3600;
                        totalSeconds += timeArr[1] * 60;
                        totalSeconds += timeArr[2];

                        return totalSeconds;
                      };

                      if (section.start && section.end) {
                        const start = getSeconds(section.start);
                        const end = getSeconds(section.end);

                        if (end - start <= 3) {
                          ditch++;
                        }
                      }
                    }

                    const result = {
                      id: firstFive[i].id,
                      videoTitle,
                      artistMatches,
                      ditchResult: ditch >= 2 ? true : false,
                      duration: firstFive[i].duration,
                      arr,
                      arrLength: arr.length,
                    };
                    allResultsArr.push(result);

                    resolve(result);
                    return result;
                  } else {
                    reject();
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

        promiseArray.push(delayedTimeoutPromise(i * 20000));
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