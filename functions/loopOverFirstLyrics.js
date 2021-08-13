const loopOverFinalLyrics = require("./loopOverFinalLyrics");
const stringSimilarity = require("string-similarity");

const loopOverFirstLyrics = async (
  geniusLyricsArr,
  newGeniusArr,
  newGeniusArrFinal,
  matchArr,
  finalMatchArr,
  youtubeLyricsArr,
  i
) => {
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

  let allSections = newGeniusArr
    .map((item) => item.sectionName)
    .filter((item, index, arr) => {
      if (item === arr[index - 1]) {
        return false;
      } else {
        return true;
      }
    });

  await loopOverFinalLyrics(
    newGeniusArrFinal,
    finalMatchArr,
    youtubeLyricsArr,
    findMatch,
    allSections,
    i
  );

  let allowedIndex = 0;

  let skippedSection = [];

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

    const alreadyMatchedSections = matchArr.map((item) => item.sectionName);

    if (specificSectionName === nextUp) {
      if (
        alreadyMatchedSections[alreadyMatchedSections.length - 1] !== nextUp
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

        const lyricMatchIndex = onlyApplicableLyricsArr.findIndex((item) => {
          if (lyricMatch) {
            if (lyricMatch.bestMatch) {
              return item.includes(lyricMatch.bestMatch.target);
            }
          }
        });

        if (lyricMatch) {
          const allRatings = lyricMatch.ratings.map((item) => item.rating);
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
              onlyApplicableArr[lyricMatchIndex].lineNumber === allowedIndex
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
                      !matchArr.map((item) => item.sectionName).includes(nextUp)
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

module.exports = loopOverFirstLyrics;
