const contentful = require("contentful");
const keysArr = require("./keysArr");

const findMixable = async () => {
  const client = contentful.createClient({
    space: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
  });

  await client
    .getEntries({
      "fields.mode": "major",
      select: "fields.title,fields.artist,fields.tempo,fields.key,fields.mode",
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
                        song1,
                        song2,
                      });
                    }
                  }
                }
              }
            }
          }

          console.log(matches.length);

          //   console.log(
          //     matches.map((item) => {
          //       return {
          //         song1: item.song1.fields,
          //         song2: item.song2.fields,
          //       };
          //     })
          //   );
        }
      }
    });
};

module.exports = findMixable;
