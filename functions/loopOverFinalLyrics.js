const loopOverFinalLyrics = async (
  newGeniusArrFinal,
  finalMatchArr,
  youtubeLyricsArr,
  findMatch,
  allSections,
  i
) => {
  for (let k = 0; k < newGeniusArrFinal.length; k++) {
    if (finalMatchArr[finalMatchArr.length - 1]) {
      const specificSectionName = newGeniusArrFinal[k].sectionName;

      const finalIndex = allSections.findIndex(
        (item) => item === finalMatchArr[finalMatchArr.length - 1].sectionName
      );

      let lastSection = allSections[finalIndex];

      let nextUp = allSections[finalIndex + 1];

      const alreadyMatchedSections = finalMatchArr.map(
        (item) => item.sectionName
      );

      if (specificSectionName === nextUp) {
        if (
          alreadyMatchedSections[alreadyMatchedSections.length - 1] !== nextUp
        ) {
          const lastApplicableArr = newGeniusArrFinal.filter(
            (item) => item.sectionName === lastSection
          );
          const lastApplicableLyricsArr = lastApplicableArr.map((item) =>
            item.lyrics.toLowerCase().replace(/[^\w\s]/gi, "")
          );
          const onlyApplicableArr = newGeniusArrFinal.filter(
            (item) => item.sectionName === nextUp
          );
          const onlyApplicableLyricsArr = onlyApplicableArr.map((item) =>
            item.lyrics.toLowerCase().replace(/[^\w\s]/gi, "")
          );

          const oldLyricMatch = findMatch(lastApplicableLyricsArr);

          const lyricMatch = findMatch(onlyApplicableLyricsArr);

          if (lyricMatch) {
            const matchJSON = {
              sectionName: nextUp,
              start: youtubeLyricsArr[i].start,
              end: youtubeLyricsArr[i].end,
              lyrics: lyricMatch.bestMatch.target,
            };

            const skipSectionFunction = () => {
              if (k === newGeniusArrFinal.length - 1) {
                finalMatchArr.push({ sectionName: nextUp });
              }
            };

            if (oldLyricMatch && lyricMatch) {
              if (
                !oldLyricMatch.bestMatch ||
                oldLyricMatch.bestMatch.rating <= lyricMatch.bestMatch.rating
              ) {
                if (lyricMatch.bestMatch.rating >= 0.45) {
                  if (
                    !finalMatchArr
                      .map((item) => item.sectionName)
                      .includes(nextUp)
                  ) {
                    finalMatchArr.push(matchJSON);

                    break;
                  } else {
                    skipSectionFunction();
                  }
                } else {
                  skipSectionFunction();
                }
              } else {
                skipSectionFunction();
              }
            } else {
              skipSectionFunction();
            }
          }
        }
      }
    }
  }
};

module.exports = loopOverFinalLyrics;
