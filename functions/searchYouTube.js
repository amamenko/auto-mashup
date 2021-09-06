const getSubtitleJSON = require("./getSubtitleJSON");
const searchVideo = require("./usetube/usetubeSearchVideo");

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

  const mustContainRegex = /(video)|(audio)|(lyrics)/gi;

  if (videos) {
    const filteredVids = videos.filter(
      (video) =>
        !filterRegex.test(video.original_title) &&
        mustContainRegex.test(video.original_title) &&
        video.original_title.toLowerCase().includes(trackTitle.toLowerCase())
    );

    const firstThree = filteredVids.slice(0, 3);

    console.log({ firstThree });

    const loopOverVideos = async () => {
      const allResultsArr = [];

      const promiseArray = [];

      for (let i = 0; i < firstThree.length; i++) {
        const delayedTimeoutPromise = async (delay) => {
          return new Promise((resolve, reject) => {
            setTimeout(async () => {
              console.log(
                `Getting subtitles for video ${i + 1} of ${
                  firstThree.length
                }: ${firstThree[i].original_title}`
              );

              return await getSubtitleJSON(
                firstThree[i].id,
                trackTitle,
                trackArtist
              )
                .then((arr) => {
                  if (arr) {
                    const result = {
                      id: firstThree[i].id,
                      duration: firstThree[i].duration,
                      arr,
                      arrLength: arr.length,
                    };
                    allResultsArr.push(result);

                    resolve(result);
                    return result;
                  } else {
                    reject;
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

      return Promise.all(promiseArray)
        .then((arr) => {
          console.log("All promises resolved!");
          return arr;
        })
        .catch((err) => {
          console.log("Error in iterable promises");
          console.log(err);
        });
    };

    return await loopOverVideos().then((arr) => {
      if (Array.isArray(arr) && arr.length > 0) {
        console.log(arr);
        const allResultLengths = arr.map((item) => item.arrLength);

        const bestMatch = arr.find(
          (item) => item.arrLength === Math.max(...allResultLengths)
        );

        return bestMatch;
      } else {
        return;
      }
    });
  } else {
    console.log("No videos found!");
  }
};

module.exports = searchYouTube;
