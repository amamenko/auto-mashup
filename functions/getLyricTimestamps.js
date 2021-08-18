const { getLyrics } = require("genius-lyrics-api");
const stringSimilarity = require("string-similarity");
const loopOverFirstLyrics = require("./loopOverFirstLyrics");

const getLyricTimestamps = async (options) => {
  return await getLyrics(options).then(async (lyrics) => {
    const geniusLyricsArr = [];
    const lyricsSplit = lyrics.split(/[\r\n]+/gi);
    const youtubeCaptions = options.youtubeCaptions;

    let sectionObj = {};
    let sectionName;
    let sectionLine = -1;

    for (let i = 0; i < lyricsSplit.length; i++) {
      if (lyricsSplit[i].includes("[") && lyricsSplit[i].includes("]")) {
        if (sectionObj["sectionName"]) {
          geniusLyricsArr.push(sectionObj);
          sectionObj = {};
        }

        const allFullSectionNames = geniusLyricsArr.map(
          (item) => item.sectionName
        );
        const allSectionNames = geniusLyricsArr.map(
          (item) => item.sectionName.split(" ")[0]
        );

        sectionName = lyricsSplit[i]
          .split(/\[([^\]]+)]/gi)[1]
          .split(/[ [:]+/gi)[0]
          .toLowerCase();

        if (allSectionNames.includes(sectionName)) {
          const newNumberArr = [
            ...new Set(
              allFullSectionNames.filter(
                (item) => item.split(" ")[0] === sectionName
              )
            ),
          ];

          const newNumber = newNumberArr.length + 1;

          sectionName = sectionName + " " + newNumber;
        } else {
          sectionName = sectionName + " 1";
        }

        sectionLine = -1;
        sectionObj["sectionName"] = sectionName;
      } else {
        sectionLine++;
        sectionObj[`line_` + sectionLine] = lyricsSplit[i];

        if (i === lyricsSplit.length - 1) {
          geniusLyricsArr.push(sectionObj);
        }
      }
    }

    const newGeniusArr = [];
    const newGeniusArrFinal = [];

    for (let i = 0; i < geniusLyricsArr.length; i++) {
      let sectionName = "";

      for (const [key, value] of Object.entries(geniusLyricsArr[i])) {
        if (key === "sectionName") {
          sectionName = value;
        }

        const pushedSection = {
          sectionName: sectionName,
          lineNumber: Number(key.split("_")[1]),
          lyrics: value,
        };

        if (key === "line_0" || key === "line_1" || key === "line_2") {
          newGeniusArr.push(pushedSection);
        }

        if (key === `line_${Object.keys(geniusLyricsArr[i]).length - 2}`) {
          newGeniusArrFinal.push(pushedSection);
        }
      }
    }

    const matchArr = [];
    const finalMatchArr = [];

    const replacementRegex = /[^\w\s]/gi;

    const onlyLyricsArr = newGeniusArr.map((item) =>
      item.lyrics.toLowerCase().replace(replacementRegex, "")
    );

    const onlyFinalLyricsArr = newGeniusArrFinal.map((item) =>
      item.lyrics.toLowerCase().replace(replacementRegex, "")
    );

    const youtubeLyricsArr = youtubeCaptions
      .map((item) => {
        return {
          start: item.start,
          end: item.end,
          lyrics: item.lyrics,
        };
      })
      .filter((item) => item.lyrics);

    for (let i = 0; i < youtubeLyricsArr.length; i++) {
      if (finalMatchArr.length === 0) {
        const firstYouTubeLyrics = youtubeLyricsArr.slice(0, 20);

        for (j = 0; j < firstYouTubeLyrics.length; j++) {
          const matchArr = stringSimilarity.findBestMatch(
            firstYouTubeLyrics[j].lyrics,
            onlyFinalLyricsArr.slice(0, 3)
          ).ratings;

          const foundMatch = matchArr.find((el) => el.rating >= 0.55);

          if (foundMatch) {
            const matchIndex = onlyFinalLyricsArr.findIndex(
              (item) => item === foundMatch.target
            );

            if (matchIndex >= 0) {
              highestFinalIndex = matchIndex;
            }

            const firstMatch = newGeniusArrFinal[matchIndex];

            finalMatchArr.push({
              sectionName: firstMatch.sectionName,
              start: firstYouTubeLyrics[j].start,
              end: firstYouTubeLyrics[j].end,
              lyrics: foundMatch.target,
            });

            break;
          }
        }
      }

      if (matchArr.length === 0) {
        const firstYouTubeLyrics = youtubeLyricsArr.slice(0, 20);

        for (j = 0; j < firstYouTubeLyrics.length; j++) {
          const match = stringSimilarity.findBestMatch(
            firstYouTubeLyrics[j].lyrics,
            onlyLyricsArr.slice(0, 5)
          ).bestMatch;

          const matchIndex = onlyLyricsArr.findIndex(
            (item) => item === match.target
          );

          if (matchIndex >= 0) {
            highestFinalIndex = matchIndex;
          }

          const firstMatch = newGeniusArr[matchIndex];

          if (match.rating >= 0.55) {
            matchArr.push({
              sectionName: firstMatch.sectionName,
              start: firstYouTubeLyrics[j].start,
              end: finalMatchArr[0]
                ? finalMatchArr[0].end
                  ? finalMatchArr[0].end
                  : firstYouTubeLyrics[j].end
                : firstYouTubeLyrics[j].end,
              lyrics: match.target,
            });

            break;
          }
        }
      } else {
        loopOverFirstLyrics(
          geniusLyricsArr,
          newGeniusArr,
          newGeniusArrFinal,
          matchArr,
          finalMatchArr,
          youtubeLyricsArr,
          i
        );
      }
    }
    // console.log(finalMatchArr);
    return matchArr;
  });
};

module.exports = getLyricTimestamps;
