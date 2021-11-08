const contentful = require("contentful");
const keysArr = require("./keysArr");
const {
  verseSections,
  refrainSections,
  preChorusSections,
  chorusSections,
  postChorusSections,
  bridgeSections,
} = require("../arrays/songSectionsArr");
const normalizeInputsAndMix = require("./normalizeInputsAndMix");
const timeStampToSeconds = require("../utils/timeStampToSeconds");

const findMixable = async () => {
  const client = contentful.createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  });

  await client
    .getEntries({
      "fields.mode": "major",
      "fields.goat": "no",
      select:
        "fields.title,fields.artist,fields.tempo,fields.key,fields.duration,fields.expectedSections,fields.sections,fields.beats,fields.accompaniment,fields.vocals",
      content_type: "song",
      limit: 200,
    })
    .then((res) => {
      if (res) {
        if (res.items) {
          const matches = [];

          for (const song1 of res.items) {
            for (let i = 0; i < res.items.length; i++) {
              const song2 = res.items[i];

              const foundIndex = keysArr.findIndex(
                (key) => key === song1.fields.key
              );

              // Potential key can be up to 2 semi-tones up or down
              const applicableArr = keysArr
                .slice(foundIndex - 2, foundIndex + 3)
                .map((item) => {
                  const regex = /(-)|(\+)/gi;
                  return item.replace(regex, "");
                });

              if (song1.sys.id !== song2.sys.id) {
                if (applicableArr.includes(song2.fields.key)) {
                  const song1KeyIndex = applicableArr.findIndex(
                    (key) => key === song1.fields.key
                  );
                  const song2KeyIndex = applicableArr.findIndex(
                    (key) => key === song2.fields.key
                  );
                  const difference = Math.abs(song1KeyIndex - song2KeyIndex);
                  const sign = song1KeyIndex - song2KeyIndex;

                  if (
                    song1.fields.title.toLowerCase() !==
                    song2.fields.title.toLowerCase()
                  ) {
                    // If potential match is within +/- 5% of initial track
                    if (
                      song1.fields.tempo * 1.05 >= song2.fields.tempo &&
                      song1.fields.tempo * 0.95 <= song2.fields.tempo
                    ) {
                      const matchExists = matches.find((el) => {
                        const ids = [];

                        for (const song in el) {
                          const obj = el[song];
                          ids.push(obj.sys.id);
                        }
                        if (
                          ids[0] === song1.sys.id &&
                          ids[1] === song2.sys.id
                        ) {
                          return true;
                        } else {
                          return false;
                        }
                      });

                      if (!matchExists) {
                        const noIntroOrOutro = (item) =>
                          item !== "intro" && item !== "outro";

                        const song1Sections = song1.fields.sections
                          .map((section) =>
                            section.sectionName
                              ? section.sectionName.split(" ")[0]
                              : ""
                          )
                          .filter(noIntroOrOutro);
                        const song2Sections = song2.fields.sections
                          .map((section) =>
                            section.sectionName
                              ? section.sectionName.split(" ")[0]
                              : ""
                          )
                          .filter(noIntroOrOutro);

                        const bothSections = [
                          {
                            name: "song1",
                            sections: song1Sections,
                          },
                          {
                            name: "song2",
                            sections: song2Sections,
                          },
                        ];

                        const adequateMatchCheck = (
                          currentSongSections,
                          otherSongSections
                        ) => {
                          let noMatch = 0;

                          for (let j = 0; j < currentSongSections.length; j++) {
                            const current = currentSongSections[j];

                            const checkInclusion = (section) => {
                              if (section.includes(current)) {
                                if (
                                  !section.some((item) =>
                                    otherSongSections.includes(item)
                                  )
                                ) {
                                  noMatch++;
                                }
                              }
                            };

                            checkInclusion(verseSections);
                            checkInclusion(refrainSections);
                            checkInclusion(preChorusSections);
                            checkInclusion(chorusSections);
                            checkInclusion(postChorusSections);
                            checkInclusion(bridgeSections);
                          }

                          return noMatch;
                        };
                        const matchArr = [];

                        for (let j = 0; j < bothSections.length; j++) {
                          const currentName = bothSections[j].name;

                          const currentSection = bothSections[j];
                          const otherSection = bothSections.find(
                            (item) => item.name !== currentName
                          );

                          const noMatches = adequateMatchCheck(
                            currentSection.sections,
                            otherSection.sections
                          );

                          matchArr.push(noMatches);
                        }

                        const song1Obj = {
                          ...song1,
                          keyScaleFactor:
                            sign === 0
                              ? 1
                              : sign > 0
                              ? 1 - (1 / 12) * difference
                              : 1 + (1 / 12) * difference,
                          tempoScaleFactor:
                            song2.fields.tempo / song1.fields.tempo,
                        };

                        const song2Obj = {
                          ...song2,
                          keyScaleFactor:
                            sign === 0
                              ? 1
                              : sign > 0
                              ? 1 + (1 / 12) * difference
                              : 1 - (1 / 12) * difference,
                          tempoScaleFactor:
                            song1.fields.tempo / song2.fields.tempo,
                        };

                        const song1SectionsTimes = song1.fields.sections.map(
                          (section) => timeStampToSeconds(section.start)
                        );
                        const song2SectionsTimes = song2.fields.sections.map(
                          (section) => timeStampToSeconds(section.start)
                        );

                        const hasDuplicates = (array) =>
                          new Set(array).size !== array.length;

                        const expectedPerfectSectionOutput = (arr) => {
                          const expectedOutputArr = [];

                          for (let j = 0; j < arr.length; j++) {
                            const current = arr[j];

                            const mostRecentMatch = expectedOutputArr.find(
                              (item) => item && item.split(" ")[0] === current
                            );

                            if (mostRecentMatch) {
                              expectedOutputArr.push(
                                current +
                                  " " +
                                  (Number(mostRecentMatch.split(" ")[1]) + 1)
                              );
                            } else {
                              expectedOutputArr.push(current + " 1");
                            }
                          }

                          return expectedOutputArr.filter(noIntroOrOutro);
                        };

                        const song1SectionNamesOnly = song1.fields
                          .expectedSections
                          ? song1.fields.expectedSections
                              .split(", ")
                              .map((section) =>
                                section.sectionName
                                  ? section.sectionName.split(" ")[0]
                                  : ""
                              )
                          : [];
                        const song2SectionNamesOnly = song2.fields
                          .expectedSections
                          ? song2.fields.expectedSections
                              .split(", ")
                              .map((section) =>
                                section.sectionName
                                  ? section.sectionName.split(" ")[0]
                                  : ""
                              )
                          : [];

                        const song1Expected = expectedPerfectSectionOutput(
                          song1SectionNamesOnly
                        );
                        const song1Actual = song1.fields.sections
                          .map((section) => section.sectionName)
                          .filter(noIntroOrOutro);
                        const song1Deviations = song1Expected.filter(
                          (item) => !song1Actual.includes(item)
                        );

                        const song2Expected = expectedPerfectSectionOutput(
                          song2SectionNamesOnly
                        );
                        const song2Actual = song2.fields.sections
                          .map((section) => section.sectionName)
                          .filter(noIntroOrOutro);
                        const song2Deviations = song2Expected.filter(
                          (item) => !song2Actual.includes(item)
                        );

                        // if (song1Deviations[0]) {
                        //   const firstDeviation = song1Deviations[0];
                        //   const deviationIndex = song1Expected.findIndex(
                        //     (item) => item === song1Deviations[0]
                        //   );
                        //   const firstSectionBefore =
                        //     song1Expected[deviationIndex - 1];

                        //   if (firstSectionBefore) {
                        //     song1Actual.find(
                        //       (item) => item === firstSectionBefore
                        //     );
                        //   }
                        // }

                        if (
                          matchArr[0] === 0 &&
                          !hasDuplicates(song1SectionsTimes) &&
                          song1Expected.length === song1Actual.length
                        ) {
                          matches.push({
                            accompaniment: song1Obj,
                            vocals: song2Obj,
                          });
                        }

                        if (
                          matchArr[1] === 0 &&
                          !hasDuplicates(song2SectionsTimes) &&
                          song2Expected.length === song2Actual.length
                        ) {
                          matches.push({
                            accompaniment: song2Obj,
                            vocals: song1Obj,
                          });
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          const makeBeatArr = (str) => {
            return [...str.split(", ").map((item) => Number(item))];
          };

          const matchArr = matches.map((item) => {
            return {
              accompaniment: {
                ...item.accompaniment.fields,
                beats: makeBeatArr(item.accompaniment.fields.beats),
                keyScaleFactor: item.accompaniment.keyScaleFactor,
                tempoScaleFactor: item.accompaniment.tempoScaleFactor,
              },
              vocals: {
                ...item.vocals.fields,
                beats: makeBeatArr(item.vocals.fields.beats),
                keyScaleFactor: item.vocals.keyScaleFactor,
                tempoScaleFactor: item.vocals.tempoScaleFactor,
              },
            };
          });

          if (matchArr && matchArr.length > 0) {
            console.log(matchArr.length);
            // normalizeInputsAndMix(
            //   matchArr[0].accompaniment,
            //   matchArr[0].vocals
            // );
          }
        }
      }
    });
};

module.exports = findMixable;
