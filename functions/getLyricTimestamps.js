const { getLyrics } = require("genius-lyrics-api");
const stringSimilarity = require("string-similarity");

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

    let highestIndex = -1;

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

    let skippedSection = [];

    for (let i = 0; i < youtubeLyricsArr.length; i++) {
      if (finalMatchArr.length === 0) {
        const firstYouTubeLyrics = youtubeLyricsArr.slice(0, 10);

        for (j = 0; j < firstYouTubeLyrics.length; j++) {
          const match = stringSimilarity.findBestMatch(
            firstYouTubeLyrics[j].lyrics,
            onlyFinalLyricsArr.slice(0, 5)
          ).bestMatch;

          const matchIndex = onlyFinalLyricsArr.findIndex(
            (item) => item === match.target
          );

          if (matchIndex >= 0) {
            highestFinalIndex = matchIndex;
          }

          const firstMatch = newGeniusArrFinal[matchIndex];

          if (match.rating >= 0.8) {
            finalMatchArr.push({
              sectionName: firstMatch.sectionName,
              start: firstYouTubeLyrics[j].start,
              end: firstYouTubeLyrics[j].end,
              lyrics: match.target,
            });

            break;
          }
        }
      }

      if (matchArr.length === 0) {
        const match = stringSimilarity.findBestMatch(
          youtubeLyricsArr[i].lyrics,
          onlyLyricsArr.slice(0, 5)
        ).bestMatch;

        const matchIndex = onlyLyricsArr.findIndex(
          (item, index) => index >= highestIndex && item === match.target
        );

        if (matchIndex >= 0) {
          highestIndex = matchIndex;
        }

        const firstMatch = newGeniusArr[matchIndex];

        const finalLyricsMatch = finalMatchArr.filter(
          (item) => item.sectionName === firstMatch.sectionName
        )[0];

        matchArr.push({
          sectionName: firstMatch.sectionName,
          start: youtubeLyricsArr[i].start,
          end: finalLyricsMatch
            ? finalLyricsMatch.end
            : youtubeLyricsArr[i].end,
          lyrics: match.target,
        });
        continue;
      } else {
        let allSections = newGeniusArr
          .map((item) => item.sectionName)
          .filter((item, index, arr) => {
            if (item === arr[index - 1]) {
              return false;
            } else {
              return true;
            }
          });

        const findMatch = (lyricArr) => {
          if (lyricArr && lyricArr.length > 0 && Array.isArray(lyricArr)) {
            if (youtubeLyricsArr[i]) {
              return stringSimilarity.findBestMatch(
                youtubeLyricsArr[i].lyrics,
                lyricArr
              );
            }
          } else {
            return null;
          }
        };

        const loopOverFinalLyrics = async () => {
          for (let k = 0; k < newGeniusArrFinal.length; k++) {
            const specificSectionName = newGeniusArrFinal[k].sectionName;

            const finalIndex = allSections.findIndex(
              (item) =>
                item === finalMatchArr[finalMatchArr.length - 1].sectionName
            );

            let lastSection = allSections[finalIndex];

            let nextUp = allSections[finalIndex + 1];

            const alreadyMatchedSections = finalMatchArr.map(
              (item) => item.sectionName
            );

            if (specificSectionName === nextUp) {
              if (
                alreadyMatchedSections[alreadyMatchedSections.length - 1] !==
                nextUp
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
                      oldLyricMatch.bestMatch.rating <=
                        lyricMatch.bestMatch.rating
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
        };

        const loopOverFirstLyrics = async () => {
          await loopOverFinalLyrics();

          let allowedIndex = 0;

          for (let j = 0; j < geniusLyricsArr.length; j++) {
            const specificSectionName = geniusLyricsArr[j].sectionName;

            const finalIndex = allSections.findIndex(
              (item) => item === matchArr[matchArr.length - 1].sectionName
            );

            let lastSection = allSections[finalIndex];

            let nextUp = allSections[finalIndex + 1];

            const correspondingFinalLastSection = finalMatchArr.filter(
              (item) => item.sectionName === lastSection
            )[0];

            const correspondingFinalMatch = finalMatchArr.filter(
              (item) => item.sectionName === nextUp
            )[0];

            if (skippedSection.length >= 1) {
              newLastSection = allSections[finalIndex + 1];
              newNextUp = allSections[finalIndex + 2];

              if (newLastSection && newNextUp) {
                matchArr.push({
                  sectionName: nextUp,
                  lyrics: null,
                });

                lastSection = newLastSection;
                nextUp = newNextUp;

                i -= 15;
              }
              skippedSection = [];
            }

            const alreadyMatchedSections = matchArr.map(
              (item) => item.sectionName
            );

            if (specificSectionName === nextUp) {
              if (
                alreadyMatchedSections[alreadyMatchedSections.length - 1] !==
                nextUp
              ) {
                const lastApplicableArr = newGeniusArr.filter(
                  (item) => item.sectionName === lastSection
                );
                const lastApplicableLyricsArr = lastApplicableArr.map((item) =>
                  item.lyrics.toLowerCase().replace(/[^\w\s]/gi, "")
                );
                const onlyApplicableArr = newGeniusArr.filter(
                  (item) => item.sectionName === nextUp
                );
                const onlyApplicableLyricsArr = onlyApplicableArr.map((item) =>
                  item.lyrics.toLowerCase().replace(/[^\w\s]/gi, "")
                );

                const oldLyricMatch = findMatch(lastApplicableLyricsArr);

                const lyricMatch = findMatch(onlyApplicableLyricsArr);

                const lyricMatchIndex = onlyApplicableLyricsArr.findIndex(
                  (item) => {
                    if (lyricMatch) {
                      if (lyricMatch.bestMatch) {
                        return item.includes(lyricMatch.bestMatch.target);
                      }
                    }
                  }
                );

                if (lyricMatch) {
                  const allRatings = lyricMatch.ratings.map(
                    (item) => item.rating
                  );
                  const allOldRatings = oldLyricMatch.ratings.map(
                    (item) => item.rating
                  );

                  const matchJSON = {
                    sectionName: nextUp,
                    lyrics: lyricMatch.bestMatch.target,
                    start: youtubeLyricsArr[i].start,
                  };

                  if (
                    allRatings.every((item) => item === 0) &&
                    (allOldRatings.every((item) => item <= 0.2) ||
                      onlyApplicableLyricsArr.length < 3)
                  ) {
                    const generalSection = nextUp.split(" ")[0];

                    if (allSections.indexOf(nextUp) <= allSections.length - 2) {
                      if (
                        !generalSection.includes("chorus") &&
                        !generalSection.includes("coro") &&
                        !generalSection.includes("estribillo") &&
                        generalSection !== "puente" &&
                        generalSection !== "bridge" &&
                        generalSection !== "outro" &&
                        generalSection !== "verse" &&
                        generalSection !== "verso"
                      ) {
                        skippedSection.push({
                          sectionName: nextUp,
                        });
                        allowedIndex = 0;
                        break;
                      }
                    }
                  } else {
                    if (
                      onlyApplicableArr[lyricMatchIndex].lineNumber ===
                      allowedIndex
                    ) {
                      if (oldLyricMatch && lyricMatch) {
                        if (
                          !oldLyricMatch.bestMatch ||
                          (oldLyricMatch.bestMatch.rating <=
                            lyricMatch.bestMatch.rating &&
                            (allowedIndex > 1
                              ? Math.abs(
                                  lyricMatch.bestMatch.rating -
                                    oldLyricMatch.bestMatch.rating
                                ) > 0.15
                              : true))
                        ) {
                          if (
                            lyricMatch.bestMatch.rating >=
                            0.45 + Number(allowedIndex / 20)
                          ) {
                            if (
                              !matchArr
                                .map((item) => item.sectionName)
                                .includes(nextUp)
                            ) {
                              if (
                                !correspondingFinalMatch ||
                                youtubeLyricsArr[i].start <=
                                  correspondingFinalMatch.start
                              ) {
                                if (
                                  !correspondingFinalLastSection ||
                                  youtubeLyricsArr[i].start >=
                                    correspondingFinalLastSection.end
                                ) {
                                  if (correspondingFinalMatch) {
                                    matchArr.push({
                                      ...matchJSON,
                                      end: correspondingFinalMatch.end,
                                    });
                                  } else {
                                    matchArr.push(matchJSON);
                                  }

                                  allowedIndex = 0;

                                  if (skippedSection.length > 0) {
                                    skippedSection = [];
                                  }

                                  break;
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }

            if (j === geniusLyricsArr.length - 1) {
              if (allowedIndex < 3) {
                j = -1;

                allowedIndex++;
                continue;
              }
            }
          }
        };

        loopOverFirstLyrics();
      }
    }

    return matchArr;
  });
};

module.exports = getLyricTimestamps;
