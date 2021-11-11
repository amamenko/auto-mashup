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
const getClosestBeatArr = require("./getClosestBeatArr");

const createComplexFilter = (instrumentals, vox) => {
  const vocalsKeyScale = vox.keyScaleFactor;
  const vocalsTempoScale = vox.tempoScaleFactor;

  // Apply BPM adjustment matching to original BPM of vocal track
  vox.beats = vox.beats.map((beat) => (1 / vocalsTempoScale) * beat);

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
      (item) =>
        item.sectionName &&
        item.start &&
        item.duration &&
        item.instrumentalSection.sectionName &&
        item.instrumentalSection.start &&
        item.instrumentalSection.duration
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

    const numberOfLoops =
      maxDuration <= endTime - section.start
        ? 0
        : Math.floor(maxDuration / (endTime - section.start));

    const loopAudios = [];

    for (let j = 0; j < numberOfLoops; j++) {
      loopAudios.push({
        filter: "acopy",
        inputs: ffmpegSectionName,
        outputs: `${ffmpegSectionName}_copy_${j}`,
      });

      if (j === 0) {
        loopAudios.push({
          filter: "chorus=0.7:0.9:55:0.4:0.25:2",
          inputs: `${ffmpegSectionName}_copy_${j}`,
          outputs: `${ffmpegSectionName}_copy_${j}_chorus`,
        });
      } else if (j === 1) {
        loopAudios.push({
          filter: "chorus=0.6:0.9:50|60:0.4|0.32:0.25|0.4:2|1.3",
          inputs: `${ffmpegSectionName}_copy_${j}`,
          outputs: `${ffmpegSectionName}_copy_${j}_chorus`,
        });
      } else {
        loopAudios.push({
          filter: "chorus=0.5:0.9:50|60|40:0.4|0.32|0.3:0.25|0.4|0.3:2|2.3|1.3",
          inputs: `${ffmpegSectionName}_copy_${j}`,
          outputs: `${ffmpegSectionName}_copy_${j}_chorus`,
        });
      }

      const currentDelay =
        relativeDelay + (endTime - section.start) * 1000 * (j + 1);

      loopAudios.push({
        filter: `adelay=${currentDelay}|${currentDelay}`,
        inputs: `${ffmpegSectionName}_copy_${j}_chorus`,
        outputs: `${ffmpegSectionName}_copy_${j}_delayed`,
      });
    }

    return [
      {
        filter: `atrim=start=${section.start}:end=${endTime}`,
        inputs: `vox:${i + 1}`,
        outputs: ffmpegSectionName,
      },
      ...loopAudios,
      // If first vocal section, fade in
      i === 0
        ? {
            filter: `afade=t=in:ss=0:d=5`,
            inputs: ffmpegSectionName,
            outputs: `${ffmpegSectionName}_fade_in`,
          }
        : // If last vocal section, fade out
        i === arr.length - 1
        ? numberOfLoops === 0
          ? {
              filter: `afade=t=out:st=${maxDuration - 5}:d=5`,
              inputs: ffmpegSectionName,
              outputs: `${ffmpegSectionName}_fade_out`,
            }
          : {
              filter: `afade=t=out:st=${maxDuration - 5}:d=5`,
              inputs: `${ffmpegSectionName}_copy_${numberOfLoops - 1}_delayed`,
              outputs: `${ffmpegSectionName}_copy_${
                numberOfLoops - 1
              }_fade_out`,
            }
        : {
            filter: "asetpts=PTS-STARTPTS",
            inputs: `${ffmpegSectionName}`,
            outputs: `${ffmpegSectionName}_pts`,
          },
      {
        filter: `adelay=${relativeDelay}|${relativeDelay}`,
        inputs:
          i === 0
            ? `${ffmpegSectionName}_fade_in`
            : i === arr.length - 1
            ? numberOfLoops === 0
              ? `${ffmpegSectionName}_fade_out`
              : `${ffmpegSectionName}_copy_${numberOfLoops - 1}_fade_out`
            : `${ffmpegSectionName}_pts`,
        outputs: `${ffmpegSectionName}_delayed`,
      },
    ];
  });

  const voxOutputNamesArr = trimmedSections.map(
    (item) => item[item.length - 1].outputs
  );

  const getRubberbandFilter = (num) => {
    const audioInputNum = num + 1;

    return [
      {
        filter: `rubberband=pitch=${vocalsKeyScale}:tempo=${vocalsTempoScale}:formant=preserved`,
        inputs: `${audioInputNum}:a`,
        outputs: `vox:${audioInputNum}`,
      },
    ];
  };

  const rubberbandFiltersArr = [...Array(instrumentals.sections.length).keys()]
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
      filter: `amix=inputs=${1 + matchedVocalSections.length}:duration=first`,
      inputs: ["0:a:normalized", ...voxOutputNamesArr],
    },
  ];

  console.log({ complexFilter });
  return complexFilter;
};

module.exports = createComplexFilter;
