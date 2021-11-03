const { searchSong } = require("genius-lyrics-api");
const removeAccents = require("remove-accents");
const timeStampToSeconds = require("../utils/timeStampToSeconds");
const getRelevantGeniusLyrics = require("./getRelevantGeniusLyrics");

const getTrackTimes = async (
  youtubeCaptions,
  videoTitle,
  videoDuration,
  trackTitle,
  artist,
  artist2,
  artist3
) => {
  let title = trackTitle;

  const options = {
    apiKey: process.env.GENIUS_CLIENT_ACCESS_TOKEN,
    originalTitle: title,
    title,
    artist: artist2 ? artist + " " + artist2 : artist,
    youtubeCaptions,
  };

  const resultLyrics = await searchSong(options)
    .then(async (res) => {
      if (res) {
        if (res.length > 0) {
          const artistArr = artist
            .split(/\s+/)
            .map((item) => item.toLowerCase());

          const filterGeniusRes = (item) => {
            const currentTitleArr = removeAccents(
              item.title.toLowerCase()
            ).split(/(\s+)|(,)/);

            if (
              currentTitleArr.some((item) => artistArr.includes(item)) &&
              !currentTitleArr.includes("spotify")
            ) {
              return true;
            }
          };

          const resultArr = res.filter(filterGeniusRes);

          if (resultArr.length === 0 && artist2) {
            const newOptions = { ...options, artist };
            await searchSong(newOptions)
              .then((newRes) => {
                if (newRes) {
                  if (newRes.length > 0) {
                    const resultArr = newRes.filter(filterGeniusRes);

                    return getRelevantGeniusLyrics(
                      resultArr,
                      artist,
                      artist2,
                      artist3,
                      videoTitle,
                      trackTitle,
                      title,
                      newOptions
                    );
                  }
                }
              })
              .catch((err) => console.log(err));
          }

          return getRelevantGeniusLyrics(
            resultArr,
            artist,
            artist2,
            artist3,
            videoTitle,
            trackTitle,
            title,
            options
          );
        }
      }
    })
    .catch((err) => console.log(err));

  if (resultLyrics) {
    if (resultLyrics.length > 0) {
      // Check if track section time breakdown covers sufficient span of track
      const lastSection = resultLyrics[resultLyrics.length - 1];
      const lastTime = lastSection.start;

      const totalSeconds = timeStampToSeconds(lastTime);

      const minimum = videoDuration * 0.65;

      if (totalSeconds >= minimum) {
        return resultLyrics;
      } else {
        return;
      }
    }
  }

  return;
};

module.exports = getTrackTimes;
