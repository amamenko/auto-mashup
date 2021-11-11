const { getLyrics } = require("genius-lyrics-api");
const stringSimilarity = require("string-similarity");
const timeStampToSeconds = require("../utils/timeStampToSeconds");
const removeAccents = require("remove-accents");

const getLyricTimestamps = async (options) => {
  const returnedLyrics = await getLyrics(options)
    .then(async (lyrics) => {
      if (lyrics) {
        const lyricsSplit = lyrics.split(/[\r\n]+/gi);
        const punctuationRegex = /[."',\/#?!♪$%\^&\*;:{}=\-_`~()]/gim;
        const youtubeCaptions = options.youtubeCaptions
          ? options.youtubeCaptions.map((item) => {
              return {
                lyrics: item.lyrics
                  .replace(punctuationRegex, "")
                  .replace("\n", " ")
                  .replace(/(\[.*\])/gim, "")
                  .trim(),
                start: item.start,
                end: item.end,
              };
            })
          : "";

        if (youtubeCaptions) {
          const bracketRegex = /\[|\]/gim;
          const sectionArr = lyricsSplit.filter(
            (lyric) => lyric.includes("[") && lyric.includes("]")
          );

          const getSection = (str) => {
            return removeAccents(
              str
                .replace(bracketRegex, "")
                .toLowerCase()
                .split(/[:]|[\s]+/gim)[0]
            );
          };

          let geniusArr = [{ sectionName: "", lyrics: "" }];

          for (let i = 0; i < sectionArr.length; i++) {
            const current = getSection(sectionArr[i]);

            // Filter non-ASCII characters
            const foreignChar = /([^\x00-\x7F]+)/gim;

            if (
              current &&
              current.length >= 3 &&
              current !== "letra" &&
              current !== "lyric" &&
              current !== "lyrics" &&
              current !== "instrumental" &&
              current !== "guitar" &&
              !foreignChar.test(current)
            ) {
              const mostRecentMatch = geniusArr.find(
                (item) => item.sectionName.split(" ")[0] === current
              );

              if (mostRecentMatch) {
                geniusArr.push({
                  sectionName:
                    current +
                    " " +
                    (Number(mostRecentMatch.sectionName.split(" ")[1]) + 1),
                  lyrics: "",
                });
              } else {
                geniusArr.push({ sectionName: current + " 1", lyrics: "" });
              }
            }
          }

          geniusArr = geniusArr.map((item, index, arr) => {
            const indexRepeat = arr
              .map((el, j) => {
                return {
                  repeat: el.sectionName === item.sectionName,
                  index: j,
                };
              })
              .filter((el) => el.repeat);

            if (indexRepeat.length > 1) {
              const foundIndex = indexRepeat.findIndex(
                (item) => item.index === index
              );

              if (foundIndex > 0) {
                const splitArr = item.sectionName.split(" ");
                return {
                  sectionName:
                    splitArr[0] + " " + (Number(splitArr[1]) + foundIndex),
                  lyrics: "",
                };
              } else {
                return item;
              }
            } else {
              return item;
            }
          });

          geniusArr = geniusArr.filter((item) => item.sectionName);

          let sectionNumber = 0;

          for (let i = 0; i < lyricsSplit.length; i++) {
            const checkForSection = (el) =>
              el.includes("[") && el.includes("]");

            const immediateNextSection = lyricsSplit[i + 1];

            if (checkForSection(lyricsSplit[i])) {
              if (
                immediateNextSection &&
                checkForSection(immediateNextSection)
              ) {
                continue;
              } else {
                const slicedLyrics = lyricsSplit.slice(i + 1);
                const nextSectionIndex = slicedLyrics.findIndex((item) =>
                  checkForSection(item)
                );

                const sectionLyrics =
                  nextSectionIndex >= 0
                    ? lyricsSplit.slice(i + 1, i + 1 + nextSectionIndex)
                    : slicedLyrics;

                if (geniusArr[sectionNumber]) {
                  geniusArr[sectionNumber].lyrics = sectionLyrics
                    .join(" ")
                    .toLowerCase()
                    .replace(punctuationRegex, "");
                  sectionNumber++;
                }
              }
            }
          }

          const matchArr = [];

          for (let i = 0; i < geniusArr.length; i++) {
            const geniusLyrics = geniusArr[i].lyrics;

            for (let j = 0; j < youtubeCaptions.length; j++) {
              const sameStart = matchArr.find(
                (item) => item.start === youtubeCaptions[j].start
              );
              const lastSectionStart = matchArr[matchArr.length - 1]
                ? timeStampToSeconds(matchArr[matchArr.length - 1].start)
                : 0;
              const currentSectionStart = timeStampToSeconds(
                youtubeCaptions[j].start
              );

              if (!sameStart) {
                if (
                  !lastSectionStart ||
                  lastSectionStart + 5 < currentSectionStart
                ) {
                  const youtubeLyrics = youtubeCaptions[j].lyrics;
                  const numChars = youtubeLyrics.length;
                  const geniusSection = geniusLyrics.slice(0, numChars + 1);

                  const similarity = stringSimilarity.compareTwoStrings(
                    youtubeLyrics,
                    geniusSection
                  );

                  if (similarity >= 0.86) {
                    matchArr.push({
                      sectionName: geniusArr[i].sectionName,
                      start: youtubeCaptions[j].start,
                      lyrics: youtubeLyrics,
                    });
                    break;
                  }
                }
              }
            }
          }

          return {
            expected: geniusArr.map((item) => item.sectionName),
            returned: matchArr.filter((item) => item.start),
          };
        } else {
          console.log("No YouTube captions available.");
          return;
        }
      } else {
        console.log("No lyrics served");
        return;
      }
    })
    .catch((err) => console.error(err));

  if (returnedLyrics) {
    return returnedLyrics;
  } else {
    return;
  }
};

module.exports = getLyricTimestamps;
