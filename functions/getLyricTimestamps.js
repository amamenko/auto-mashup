const { getLyrics } = require("genius-lyrics-api");
const axios = require("axios");
const stringSimilarity = require("string-similarity");

const getLyricTimestamps = async (options) => {
  return await getLyrics(options).then(async (lyrics) => {
    const geniusLyricsArr = [];
    const lyricsSplit = lyrics.split(/[\r\n]+/gi);
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

    return await axios
      .get(
        "https://api.textyl.co/api/lyrics?q=" +
          encodeURI(
            options.artist.toLowerCase() +
              " " +
              options.originalTitle.toLowerCase()
          )
      )
      .then((res) => {
        const originalTextylLyricsArr = res.data;

        const newGeniusArr = [];

        for (let i = 0; i < geniusLyricsArr.length; i++) {
          let sectionName = "";
          for (const [key, value] of Object.entries(geniusLyricsArr[i])) {
            if (key === "sectionName") {
              sectionName = value;
            }
            if (key === "line_0" || key === "line_1" || key === "line_2") {
              newGeniusArr.push({
                sectionName: sectionName,
                lineNumber: Number(key.split("_")[1]),
                lyrics: value,
              });
            }
          }
        }

        const matchArr = [];

        let highestIndex = -1;

        const onlyLyricsArr = newGeniusArr.map((item) =>
          item.lyrics.toLowerCase().replace(/[^\w\s]/gi, "")
        );

        const textylLyricsArr = originalTextylLyricsArr
          .map((item) => {
            return {
              seconds: item.seconds,
              lyrics: item.lyrics
                .toLowerCase()
                .replace(/[^\w\s]/gi, "")
                .replace("\r", ""),
            };
          })
          .filter((item) => item.lyrics);

        let skippedSection = [];

        for (let i = 0; i < textylLyricsArr.length; i++) {
          if (matchArr.length === 0) {
            const match = stringSimilarity.findBestMatch(
              textylLyricsArr[i].lyrics,
              onlyLyricsArr.slice(0, 5)
            ).bestMatch;

            const matchIndex = onlyLyricsArr.findIndex(
              (item, index) => index >= highestIndex && item === match.target
            );

            if (matchIndex >= 0) {
              highestIndex = matchIndex;
            }

            const firstMatch = newGeniusArr[matchIndex];

            matchArr.push({
              sectionName: firstMatch.sectionName,
              seconds: textylLyricsArr[i].seconds,
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

            let allowedIndex = 0;

            for (let j = 0; j < geniusLyricsArr.length; j++) {
              const specificSectionName = geniusLyricsArr[j].sectionName;

              const finalIndex = allSections.findIndex(
                (item) => item === matchArr[matchArr.length - 1].sectionName
              );

              let lastSection = allSections[finalIndex];

              let nextUp = allSections[finalIndex + 1];

              if (skippedSection.length >= 1) {
                newLastSection = allSections[finalIndex + 1];
                newNextUp = allSections[finalIndex + 2];

                if (newLastSection && newNextUp) {
                  matchArr.push({
                    sectionName: nextUp,
                    seconds: null,
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
                  const lastApplicableLyricsArr = lastApplicableArr.map(
                    (item) => item.lyrics.toLowerCase().replace(/[^\w\s]/gi, "")
                  );
                  const onlyApplicableArr = newGeniusArr.filter(
                    (item) => item.sectionName === nextUp
                  );
                  const onlyApplicableLyricsArr = onlyApplicableArr.map(
                    (item) => item.lyrics.toLowerCase().replace(/[^\w\s]/gi, "")
                  );

                  const findMatch = (lyricArr) => {
                    if (
                      lyricArr &&
                      lyricArr.length > 0 &&
                      Array.isArray(lyricArr)
                    ) {
                      if (textylLyricsArr[i]) {
                        return stringSimilarity.findBestMatch(
                          textylLyricsArr[i].lyrics,
                          lyricArr
                        );
                      }
                    } else {
                      return null;
                    }
                  };

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
                      seconds: textylLyricsArr[i].seconds,
                      lyrics: lyricMatch.bestMatch.target,
                    };

                    if (
                      allRatings.every((item) => item === 0) &&
                      (allOldRatings.every((item) => item <= 0.2) ||
                        onlyApplicableLyricsArr.length < 3)
                    ) {
                      const generalSection = nextUp.split(" ")[0];

                      if (
                        allSections.indexOf(nextUp) <=
                        allSections.length - 2
                      ) {
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
                              0.45 + Number(allowedIndex / 40)
                            ) {
                              const allSeconds = matchArr
                                .map((item) => item.seconds)
                                .filter((item) => item);

                              const lastDuration =
                                allSeconds[allSeconds.length - 1];

                              if (
                                lastDuration
                                  ? textylLyricsArr[i].seconds > lastDuration
                                  : true
                              ) {
                                if (
                                  !matchArr
                                    .map((item) => item.sectionName)
                                    .includes(nextUp)
                                ) {
                                  matchArr.push(matchJSON);

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

              if (j === geniusLyricsArr.length - 1) {
                if (allowedIndex < 3) {
                  j = -1;

                  allowedIndex++;
                  continue;
                }
              }
            }
          }
        }

        return matchArr.filter((item) => item.seconds !== null);
      });
  });
};

module.exports = getLyricTimestamps;
