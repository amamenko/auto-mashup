const getLyricTimestamps = require("./getLyricTimestamps");
const stringSimilarity = require("string-similarity");
const removeAccents = require("remove-accents");

const getRelevantGeniusLyrics = async (
  resultArr,
  artist,
  artist2,
  artist3,
  videoTitle,
  trackTitle,
  title,
  options
) => {
  const urlArr = resultArr
    .map((item) => {
      return {
        ...item,
        url: item.url.split(".com/")[1].replace(/(-)/gi, " ").toLowerCase(),
      };
    })
    .filter((item) => {
      let possibleTitle = "";
      const cleanUpRegex = /(')|(\.)+/gi;

      const formatTitleFunction = (title) => {
        return title
          .toLowerCase()
          .replace(cleanUpRegex, "")
          .replace(/(-)/gi, " ");
      };

      if (artist3) {
        possibleTitle =
          artist + " " + artist2 + " " + artist3 + " " + trackTitle;
      } else if (artist2) {
        possibleTitle = artist + " " + artist2 + " " + trackTitle;
      } else {
        possibleTitle = artist + " " + trackTitle;
      }

      possibleTitle = formatTitleFunction(possibleTitle);

      const similarity1 = stringSimilarity.compareTwoStrings(
        possibleTitle + " lyrics",
        item.url
      );

      const similarity2 = stringSimilarity.compareTwoStrings(
        possibleTitle + " remix lyrics",
        item.url
      );

      if (similarity1 >= 0.87 || similarity2 >= 0.87) {
        return true;
      } else {
        let newTitle = "";
        if (artist3) {
          newTitle = artist + " " + artist2 + " " + trackTitle;
        } else {
          if (artist2) {
            newTitle = artist + " " + trackTitle;
          }
        }

        newTitle = formatTitleFunction(newTitle);

        const newSimilarity1 = stringSimilarity.compareTwoStrings(
          newTitle + " lyrics",
          item.url
        );

        const newSimilarity2 = stringSimilarity.compareTwoStrings(
          newTitle + " remix lyrics",
          item.url
        );

        if (newSimilarity1 >= 0.87 || newSimilarity2 >= 0.87) {
          return true;
        } else {
          let newestTitle = "";
          if (artist3) {
            newestTitle = artist + " " + trackTitle;

            newestTitle = formatTitleFunction(newestTitle);

            const newestSimilarity1 = stringSimilarity.compareTwoStrings(
              newestTitle + " lyrics",
              item.url
            );

            const newestSimilarity2 = stringSimilarity.compareTwoStrings(
              newestTitle + " remix lyrics",
              item.url
            );

            if (newestSimilarity1 >= 0.87 || newestSimilarity2 >= 0.87) {
              return true;
            }
          }
        }
      }
    });

  if (urlArr[0]) {
    const titleRegex = /(\s{1}by\s{1})(?!.*\1)/gi;

    const newTitleArr = urlArr[0].title.split(titleRegex);

    if (title !== newTitleArr[0].trim()) {
      options.title = newTitleArr[0].trim();
    }

    return await getLyricTimestamps(options).then(async (lyricArr) => {
      if (lyricArr) {
        if (urlArr[1]) {
          const secondTitle = urlArr[1].title.split(titleRegex)[0].trim();

          const newOptions = {
            ...options,
            title: secondTitle,
          };

          const formattedVideoTitle = removeAccents(videoTitle).toLowerCase();

          const firstTitleFormatted = removeAccents(
            urlArr[0].title.split(titleRegex)[0].trim()
          ).toLowerCase();

          return await getLyricTimestamps(newOptions).then((newLyricArr) => {
            if (formattedVideoTitle.includes("remix")) {
              if (firstTitleFormatted.includes("remix")) {
                return lyricArr;
              } else {
                return newLyricArr;
              }
            } else {
              if (newLyricArr.length > lyricArr.length) {
                return newLyricArr;
              } else {
                return lyricArr;
              }
            }
          });
        } else {
          return lyricArr;
        }
      }
    });
  }
};

module.exports = getRelevantGeniusLyrics;
