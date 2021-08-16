const { searchSong } = require("genius-lyrics-api");
const getLyricTimestamps = require("./getLyricTimestamps");

const getTrackTimes = async (youtubeCaptions, trackTitle, artist) => {
  let title = trackTitle;

  const options = {
    apiKey: process.env.GENIUS_CLIENT_ACCESS_TOKEN,
    originalTitle: title,
    title: title,
    artist: artist,
    youtubeCaptions,
  };

  searchSong(options)
    .then(async (res) => {
      if (res) {
        if (res.length > 0) {
          const artistArr = artist
            .split(/\s+/)
            .map((item) => item.toLowerCase());

          const resultArr = res.filter((item) => {
            const currentTitleArr = item.title.toLowerCase().split(/\s+/);

            if (
              currentTitleArr.some((item) => artistArr.includes(item)) &&
              !currentTitleArr.includes("spotify")
            ) {
              return true;
            }
          });

          if (resultArr[0]) {
            const titleRegex = /(\s{1}by\s{1})(?!.*\1)/gi;

            const newTitleArr = resultArr[0].title.split(titleRegex);

            if (title !== newTitleArr[0].trim()) {
              options.title = newTitleArr[0].trim();
            }

            await getLyricTimestamps(options).then(async (lyricArr) => {
              console.log({ lyricArr });
              if (lyricArr) {
                if (lyricArr.length <= 4) {
                  if (resultArr[1]) {
                    const newOptions = {
                      ...options,
                      title: resultArr[1].title.split(titleRegex)[0].trim(),
                    };

                    return await getLyricTimestamps(newOptions).then(
                      (newLyricArr) => {
                        if (newLyricArr.length > lyricArr.length) {
                          return newLyricArr;
                        } else {
                          return lyricArr;
                        }
                      }
                    );
                  } else {
                    return lyricArr;
                  }
                } else {
                  return lyricArr;
                }
              }
            });
          }
        }
      }
    })
    .catch((err) => console.log(err));
};

module.exports = getTrackTimes;
