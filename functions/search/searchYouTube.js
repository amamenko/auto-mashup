const getSubtitleJSON = require("./getSubtitleJSON");
const searchVideo = require("../usetube/usetubeSearchVideo");

const searchYouTube = async (trackTitle, trackArtist) => {
  const videos = await searchVideo(`${trackTitle} ${trackArtist} lyrics`).then(
    async (results) => {
      if (results) {
        if (results.videos) {
          if (results.videos.length > 0) {
            const allResultsArr = results.videos;

            return allResultsArr;
          } else {
            console.log("No results found!");
          }
        }
      }
    }
  );

  const filterRegex =
    /(live)|(instrumental)|(tik[\s]*tok)|(karaoke)|(reaction video)|(minecraft)|(\(reaction\))|(- reaction)|(kidz bop)|(\| verified)|(parody)|(pronunciation)|(\(cover\))/gim;

  const mustContainRegex =
    /(video)|(audio)|(lyrics)|(mv)|(music video)|(music)/gi;

  if (videos) {
    const filteredVids = videos.filter(
      (video) =>
        !filterRegex.test(video.original_title) &&
        mustContainRegex.test(video.original_title) &&
        video.original_title.toLowerCase().includes(trackTitle.toLowerCase())
    );

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

              return await getSubtitleJSON(
                firstFour[i].id,
                trackTitle,
                trackArtist
              )
                .then((arr) => {
                  if (arr) {
                    const result = {
                      id: firstFour[i].id,
                      duration: firstFour[i].duration,
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
    console.log("No videos found!");
  }
};

module.exports = searchYouTube;
