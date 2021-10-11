const getSubtitleJSON = require("./getSubtitleJSON");
const removeAccents = require("remove-accents");

const filterVideoResults = async (videos, trackTitle, trackArtist) => {
  // Filter by terms and non-ASCII characters
  const filterRegex =
    /(live)|(instrumental)|(tik[\s]*tok)|(karaoke)|(reaction video)|(nightcore)|(minecraft)|(\(reaction\))|(- reaction)|(kidz bop)|(\| verified)|(parody)|(pronunciation)|(meaning of)|(music box)|(learn english)|(explain)(ed|ation)|(translation)|(traducao)|([^\x00-\x7F]+)/gim;

  const mustContainRegex =
    /(video)|(audio)|(lyrics)|(mv)|(music video)|(music)/gim;

  const filteredVids = videos.filter(
    (video) =>
      !filterRegex.test(removeAccents(video.original_title)) &&
      !removeAccents(video.original_title).includes("cover") &&
      mustContainRegex.test(removeAccents(video.original_title)) &&
      removeAccents(video.original_title.toLowerCase()).includes(
        removeAccents(trackTitle).toLowerCase()
      ) &&
      video.duration < 660
  );

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
