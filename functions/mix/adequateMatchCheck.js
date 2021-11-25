const {
  verseSections,
  refrainSections,
  preChorusSections,
  chorusSections,
  postChorusSections,
  bridgeSections,
} = require("../arrays/songSectionsArr");

const adequateMatchCheck = (currentSongSections, otherSongSections) => {
  const acceptableSections = [];

  for (let j = 0; j < currentSongSections.length; j++) {
    for (let k = 0; k < currentSongSections[j].length; k++) {
      const current = currentSongSections[k];

      if (
        current &&
        current.length === 4 &&
        !current.includes("intro 1") &&
        !current.includes("intro 2") &&
        !current.includes("outro")
      ) {
        const applicableSongsSectionsArr = [
          verseSections,
          refrainSections,
          preChorusSections,
          chorusSections,
          postChorusSections,
          bridgeSections,
        ];

        const noMatch = 0;

        const checkInclusion = (section) => {
          if (section.includes(current)) {
            if (!section.some((item) => otherSongSections.includes(item))) {
              noMatch++;
            }
          }
        };

        for (let l = 0; l < applicableSongsSectionsArr.length; l++) {
          checkInclusion(applicableSongsSectionsArr[l]);
        }

        if (noMatch === 0) {
          acceptableSections.push(currentSongSections[j]);
        }
      }
    }
  }

  return acceptableSections;
};

module.exports = { adequateMatchCheck };
