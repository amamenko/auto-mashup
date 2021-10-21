const contentful = require("contentful");
const keysArr = require("./keysArr");
const mixTracks = require("./mixTracks");
const {
  verseSections,
  preChorusSections,
  chorusSections,
  postChorusSections,
  bridgeSections,
} = require("../arrays/songSectionsArr");

const findMixable = async () => {
  const client = contentful.createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  });

  await client
    .getEntries({
      "fields.mode": "major",
      select:
        "fields.title,fields.artist,fields.tempo,fields.key,fields.duration,fields.sections,fields.beats,fields.accompaniment,fields.vocals",
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
                        ids.includes(song1.sys.id) &&
                        ids.includes(song2.sys.id)
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
                        .map((section) => section.sectionName.split(" ")[0])
                        .filter(noIntroOrOutro);
                      const song2Sections = song2.fields.sections
                        .map((section) => section.sectionName.split(" ")[0])
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
                          checkInclusion(preChorusSections);
                          checkInclusion(chorusSections);
                          checkInclusion(postChorusSections);
                          checkInclusion(bridgeSections);
                        }

                        return noMatch;
                      };

                      const matchArr = [];

                      for (let i = 0; i < bothSections.length; i++) {
                        const currentName = bothSections[i].name;

                        const currentSection = bothSections[i];
                        const otherSection = bothSections.find(
                          (item) => item.name !== currentName
                        );

                        const noMatches = adequateMatchCheck(
                          currentSection.sections,
                          otherSection.sections
                        );

                        matchArr.push(noMatches);
                      }

                      if (!matchArr.some((item) => item > 2)) {
                        matches.push({
                          song1: {
                            ...song1,
                            keyScaleFactor:
                              sign === 0
                                ? 1
                                : sign > 0
                                ? 1 - (1 / 12) * difference
                                : 1 + (1 / 12) * difference,
                            tempoScaleFactor:
                              song2.fields.tempo / song1.fields.tempo,
                          },
                          song2: {
                            ...song2,
                            keyScaleFactor:
                              sign === 0
                                ? 1
                                : sign > 0
                                ? 1 + (1 / 12) * difference
                                : 1 - (1 / 12) * difference,
                            tempoScaleFactor:
                              song1.fields.tempo / song2.fields.tempo,
                          },
                        });
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
              song1: {
                ...item.song1.fields,
                beats: makeBeatArr(item.song1.fields.beats),
                keyScaleFactor: item.song1.keyScaleFactor,
                tempoScaleFactor: item.song1.tempoScaleFactor,
              },
              song2: {
                ...item.song2.fields,
                beats: makeBeatArr(item.song2.fields.beats),
                keyScaleFactor: item.song2.keyScaleFactor,
                tempoScaleFactor: item.song2.tempoScaleFactor,
              },
            };
          });

          if (matchArr && matchArr.length > 0) {
            // console.log(matchArr.length);
            mixTracks(matchArr[0].song1, matchArr[0].song2);
          }
        }
      }
    });
};

module.exports = findMixable;
