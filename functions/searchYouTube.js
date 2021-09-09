const getSubtitleJSON = require("./getSubtitleJSON");
const searchVideo = require("./usetube/usetubeSearchVideo");
const getVideoSubtitles = require("./usetube/usetubeGetVideoSubtitles");

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
    const potentialVidArr = [];

    // Narrow down potential videos by filtering out auto-generated subtitles and irrelevant subtitles
    for (let i = 0; i < videos.length; i++) {
      await getVideoSubtitles(videos[i].id)
        .then((subtitles) => {
          if (subtitles) {
            const filteredArr = subtitles.filter((item) => {
              if (item.segs && item.segs.every((value) => !value.acAsrConf)) {
                return true;
              }
            });

            const justLyrics = filteredArr
              .map((item) => item.segs[0].utf8)
              .filter(
                (item) =>
                  item !== "\n" && item !== "[Music]" && item !== "[Applause]"
              );

            if (justLyrics.length > 0) {
              potentialVidArr.push(videos[i]);
            }
          }
        })
        .catch((err) => {
          console.log(err.message);
          return;
        });
    }

    const filteredVids = potentialVidArr.filter(
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
