const contentful = require("contentful");
const keysArr = require("./keysArr");
const mixTracks = require("./mixTracks");

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
            mixTracks(matchArr[0].song1, matchArr[0].song2);
          }
        }
      }
    });
};

module.exports = findMixable;
