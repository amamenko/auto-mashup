const { getLyrics } = require("genius-lyrics-api");
const stringSimilarity = require("string-similarity");

const newLyricTimestamps = async (options) => {
  const returnedLyrics = await getLyrics(options)
    .then(async (lyrics) => {
      if (lyrics) {
        const geniusLyricsArr = [];
        const lyricsSplit = lyrics.split(/[\r\n]+/gi);
        const youtubeCaptions = options.youtubeCaptions;

        let sectionObj = [{ sectionName: "", sectionLyrics: "" }];

        if (youtubeCaptions) {
          for (let i = 0; i < lyricsSplit.length; i++) {
            if (lyricsSplit[i].includes("[") && lyricsSplit[i].includes("]")) {
              if (sectionObj["sectionName"]) {
                geniusLyricsArr.push(sectionObj);
                sectionObj = {};
              }
            }
          }

          console.log({
            youtubeCaptions,
            lyricsSplit,
          });
          const matchArr = [];

          return matchArr;
        } else {
          console.log("No YouTube captions available.");
          return [];
        }
      } else {
        console.log("No lyrics served");
        return [];
      }
    })
    .catch((err) => console.error(err));

  if (returnedLyrics) {
    return returnedLyrics.filter((item) => item.start);
  } else {
    return [];
  }
};

module.exports = newLyricTimestamps;
