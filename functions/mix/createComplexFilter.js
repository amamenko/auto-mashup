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

  let instrumentalSections = instrumentals.sections.map(
    getClosestBeatArr,
    instrumentals
  );
  const mixStart = instrumentalSections[0].start;
  const mixLastSectionIndex = instrumentalSections.findIndex(
    (section) => section.start - mixStart >= 80
  );

  if (mixLastSectionIndex >= -1) {
    instrumentalSections = instrumentalSections.slice(0, mixLastSectionIndex);
  }

  // console.log({
  //   mixStart,
  //   mixLastSectionIndex,
  //   instrumentalSections,
  // });

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

    const duration = endTime - section.start;

    const numberOfLoops =
      maxDuration <= duration ? 0 : Math.round(maxDuration / duration) - 1;

    const chorusEffectArr = [];
    const allSplitSections = [];
    const allTrimmedSections = [];

    let currentMax = maxDuration;

    for (let j = 0; j < numberOfLoops + 1; j++) {
      const sectionStart = section.start + duration * j;
      const sectionEnd = endTime + duration * j;
      const sectionDur = sectionEnd - sectionStart;

      currentMax -= sectionDur;

      chorusEffectArr.push({
        filter: `atrim=start=${sectionStart}:end=${
          currentMax < sectionDur ? sectionStart + currentMax : sectionEnd
        }`,
        inputs: `${ffmpegSectionName}_split_${j}`,
        outputs: `${ffmpegSectionName}_trimmed_${j}`,
      });

      if (j === 0) {
        chorusEffectArr.push({
          filter: "chorus=0.7:0.9:55:0.4:0.25:2",
          inputs: `${ffmpegSectionName}_trimmed_${j}`,
          outputs: `${ffmpegSectionName}_chorus_${j}`,
        });
      } else if (j === 1) {
        chorusEffectArr.push({
          filter: "chorus=0.6:0.9:50|60:0.4|0.32:0.25|0.4:2|1.3",
          inputs: `${ffmpegSectionName}_trimmed_${j}`,
          outputs: `${ffmpegSectionName}_chorus_${j}`,
        });
      } else {
        chorusEffectArr.push({
          filter: "chorus=0.5:0.9:50|60|40:0.4|0.32|0.3:0.25|0.4|0.3:2|2.3|1.3",
          inputs: `${ffmpegSectionName}_trimmed_${j}`,
          outputs: `${ffmpegSectionName}_chorus_${j}`,
        });
      }

      // All concatentated sections have to start at 0
      chorusEffectArr.push({
        filter: "asetpts=PTS-STARTPTS",
        inputs: `${ffmpegSectionName}_chorus_${j}`,
        outputs: `${ffmpegSectionName}_chorus_pts_${j}`,
      });

      allSplitSections.push(`${ffmpegSectionName}_split_${j}`);
      allTrimmedSections.push(`${ffmpegSectionName}_chorus_pts_${j}`);
    }

    const sectionNormalizedFilter = {
      filter: "loudnorm",
      inputs: `${ffmpegSectionName}_fade_out`,
      outputs: `${ffmpegSectionName}_normalized`,
    };

    const loopsFilters =
      numberOfLoops === 0
        ? [sectionNormalizedFilter]
        : [
            sectionNormalizedFilter,
            {
              filter: "asplit",
              options: allSplitSections.length,
              inputs: `${ffmpegSectionName}_normalized`,
              outputs: allSplitSections,
            },
            ...chorusEffectArr,
            {
              filter: `concat=n=${numberOfLoops + 1}:v=0:a=1`,
              inputs: allTrimmedSections,
              outputs: `${ffmpegSectionName}_concat`,
            },
          ];

    return [
      {
        filter: `atrim=start=${section.start}:end=${endTime}`,
        inputs: `vox:${i + 1}`,
        outputs: ffmpegSectionName,
      },
      {
        filter: `aloop=loop=${numberOfLoops}:size=${
          (endTime - section.start) * 44100
        }:start=0`,
        inputs: ffmpegSectionName,
        outputs: `loop${i + 1}`,
      },
      {
        filter: `atrim=duration=${maxDuration}`,
        inputs: `loop${i + 1}`,
        outputs: `${ffmpegSectionName}_trim`,
      },
      // If first vocal section, fade in
      i === 0
        ? {
            filter: `afade=t=in:ss=0:d=20`,
            inputs: `${ffmpegSectionName}_trim`,
            outputs: `${ffmpegSectionName}_fade_in`,
          }
        : // Otherwise, fade out
        i === arr.length - 1
        ? {
            filter: `afade=t=out:st=${maxDuration - 10}:d=10`,
            inputs: `${ffmpegSectionName}_trim`,
            outputs: `${ffmpegSectionName}_fade`,
          }
        : {
            filter: `afade=t=out:st=${maxDuration - 5}:d=5`,
            inputs: `${ffmpegSectionName}_trim`,
            outputs: `${ffmpegSectionName}_fade`,
          },
      // If first vocal section - fade out, as well
      i === 0
        ? {
            filter: `afade=t=out:st=${maxDuration - 5}:d=5`,
            inputs: `${ffmpegSectionName}_fade_in`,
            outputs: `${ffmpegSectionName}_fade_out`,
          }
        : {
            filter: "volume=1",
            inputs: `${ffmpegSectionName}_fade`,
            outputs: `${ffmpegSectionName}_fade_out`,
          },
      ...loopsFilters,
      {
        filter: `adelay=${relativeDelay}|${relativeDelay}`,
        inputs:
          numberOfLoops === 0
            ? `${ffmpegSectionName}_normalized`
            : `${ffmpegSectionName}_concat`,
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
      // Push the vocal volume up for vox
      {
        filter: "volume=20",
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
