const timeStampToSeconds = require("../utils/timeStampToSeconds");
const {
  introSections,
  verseSections,
  refrainSections,
  preChorusSections,
  chorusSections,
  postChorusSections,
  bridgeSections,
  outroSections,
} = require("../arrays/songSectionsArr");
const removeAccents = require("remove-accents");

const createComplexFilter = (instrumentals, vox) => {
  const vocalsKeyScale = vox.keyScaleFactor;
  const vocalsTempoScale = vox.tempoScaleFactor;

  // Apply BPM adjustment matching to original BPM of vocal track
  vox.beats = vox.beats.map((beat) => (1 / vocalsTempoScale) * beat);

  const findClosestBeat = (seconds, song) => {
    const beats = song.beats;
    const closest = beats.reduce((a, b) => {
      return Math.abs(b - seconds) < Math.abs(a - seconds) ? b : a;
    });
    const indexClosest = beats.findIndex((item) => item === closest);

    // Round down one beat, if possible
    return beats[indexClosest - 1]
      ? beats[indexClosest - 1]
      : beats[indexClosest];
  };

  function getClosestBeatArr(section, index, arr) {
    const song = this;
    const nextSection = arr[index + 1];
    const startTime = findClosestBeat(timeStampToSeconds(section.start), song);
    const nextSectionStartTime = nextSection
      ? findClosestBeat(timeStampToSeconds(nextSection.start), song)
      : song.duration;

    return {
      start: startTime,
      duration: nextSectionStartTime - startTime,
      sectionName: section.sectionName,
    };
  }

  const instrumentalSections = instrumentals.sections.map(
    getClosestBeatArr,
    instrumentals
  );
  const vocalSections = vox.sections.map(getClosestBeatArr, vox);
  const voxNameSections = vox.sections.map((item) => item.sectionName);

  const matchedVocalSections = instrumentalSections
    .map((instrumentalSection) => {
      const name = instrumentalSection.sectionName.split(" ")[0];
      const number = instrumentalSection.sectionName.split(" ")[1];

      function closestMatch(section) {
        const generalSection = JSON.parse(this);
        const voxSectionName = section.sectionName.split(" ")[0];
        const voxSectionNumber = section.sectionName.split(" ")[1];

        if (generalSection.includes(voxSectionName)) {
          if (number === voxSectionNumber) {
            return true;
          } else {
            if (voxNameSections.includes(voxSectionName + " " + number)) {
              return false;
            } else {
              return true;
            }
          }
        }
      }

      if (introSections.includes(name)) {
        return {
          ...vocalSections.find(closestMatch, JSON.stringify(introSections)),
          instrumentalSection,
        };
      } else if (verseSections.includes(name)) {
        return {
          ...vocalSections.find(closestMatch, JSON.stringify(verseSections)),
          instrumentalSection,
        };
      } else if (refrainSections.includes(name)) {
        return {
          ...vocalSections.find(closestMatch, JSON.stringify(refrainSections)),
          instrumentalSection,
        };
      } else if (preChorusSections.includes(name)) {
        return {
          ...vocalSections.find(
            closestMatch,
            JSON.stringify(preChorusSections)
          ),
          instrumentalSection,
        };
      } else if (chorusSections.includes(name)) {
        return {
          ...vocalSections.find(closestMatch, JSON.stringify(chorusSections)),
          instrumentalSection,
        };
      } else if (postChorusSections.includes(name)) {
        return {
          ...vocalSections.find(
            closestMatch,
            JSON.stringify(postChorusSections)
          ),
          instrumentalSection,
        };
      } else if (bridgeSections.includes(name)) {
        return {
          ...vocalSections.find(closestMatch, JSON.stringify(bridgeSections)),
          instrumentalSection,
        };
      } else if (outroSections.includes(name)) {
        return {
          ...vocalSections.find(closestMatch, JSON.stringify(outroSections)),
          instrumentalSection,
        };
      } else {
        return null;
      }
    })
    .filter(
      (item) => item.sectionName
      //     &&
      // item.start &&
      // item.duration &&
      // item.instrumentalSection.sectionName &&
      // item.instrumentalSection.start &&
      // item.instrumentalSection.duration
    );

  const trimmedSections = matchedVocalSections.map((section, i, arr) => {
    const currentIndex = vocalSections.findIndex(
      (item) => item.sectionName === section.sectionName
    );
    const nextSection = vocalSections[currentIndex + 1];

    const instrumentalSection = section.instrumentalSection;
    const delay = instrumentalSection.start;
    const maxDuration = instrumentalSection.duration;
    const startTime = section.start;

    let endTime = nextSection
      ? nextSection.start
        ? nextSection.start
        : vox.duration
      : vox.duration;

    const defaultDuration = endTime - startTime;

    if (defaultDuration > maxDuration) {
      endTime = startTime + maxDuration;
    }

    const ffmpegSectionName = `${removeAccents(
      instrumentalSection.sectionName
    )}`.replace(" ", ":");

    const relativeDelay = delay * 1000;

    return [
      {
        filter: `atrim=start=${section.start}:end=${endTime}`,
        inputs: `vox:${i + 1}`,
        outputs: ffmpegSectionName,
      },
      {
        filter: `aloop=loop=${
          maxDuration <= endTime - section.start
            ? 0
            : maxDuration / (endTime - section.start)
        }:size=${(endTime - section.start) * 44100}:start=0`,
        inputs: ffmpegSectionName,
        outputs: `loop${i + 1}`,
      },
      {
        filter: `atrim=duration=${maxDuration}`,
        inputs: `loop${i + 1}`,
        outputs: `${ffmpegSectionName}_trim`,
      },
      {
        filter: "loudnorm",
        inputs: `${ffmpegSectionName}_trim`,
        outputs: `${ffmpegSectionName}_normalized`,
      },
      {
        filter: `adelay=${relativeDelay}|${relativeDelay}`,
        inputs: `${ffmpegSectionName}_normalized`,
        outputs: `${ffmpegSectionName}_delayed`,
      },
    ];
  });

  const voxOutputNamesArr = trimmedSections.map((item) => item[4].outputs);

  const getRubberbandFilter = (num) => {
    const audioInputNum = num + 1;

    return [
      {
        filter: "volume=4",
        inputs: `${audioInputNum}:a`,
        outputs: `${audioInputNum}_louder:a`,
      },
      {
        filter: `rubberband=pitch=${vocalsKeyScale}:tempo=${vocalsTempoScale}:formant=preserved`,
        inputs: `${audioInputNum}_louder:a`,
        outputs: `vox:${audioInputNum}`,
      },
    ];
  };

  const rubberbandFiltersArr = [...Array(vox.sections.length).keys()]
    .map(getRubberbandFilter)
    .slice(0, trimmedSections.length);

  const complexFilter = [
    // Normalize instrumental audio
    {
      filter: "loudnorm",
      inputs: "0:a",
      outputs: "0:a:normalized",
    },
    // Apply vocal pitching / tempo scaling adjustments
    ...rubberbandFiltersArr.flat(),
    // Apply section trimming and appropriate time delays to vox
    ...trimmedSections.flat(),
    // Mix instrumentals and pitched vocal sections together
    {
      filter: `amix=inputs=${1 + rubberbandFiltersArr.length}:duration=first`,
      inputs: ["0:a:normalized", ...voxOutputNamesArr],
    },
  ];

  console.log({ complexFilter });
  return complexFilter;
};

module.exports = createComplexFilter;
