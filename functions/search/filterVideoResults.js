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
                firstFive[i].duration,
                trackTitle,
                trackArtist
              )
                .then((arr) => {
                  if (arr) {
                    const result = {
                      id: firstFive[i].id,
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
          const existenceArr = arr.filter((item) => item);
          const allResultLengths = existenceArr.map((item) =>
            item.arrLength ? item.arrLength : 0
          );

          const bestMatch = existenceArr.find(
            (item) => item.arrLength === Math.max(...allResultLengths)
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
