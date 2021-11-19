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

    for (let j = 0; j < numberOfLoops + 1; j++) {
      const currentSectionStart = j * duration;
      const sectionDelay = currentSectionStart * 1000;
      let currentTotalDuration = (j + 1) * duration;
      let currentSectionEnd = duration;

      if (maxDuration < currentTotalDuration) {
        currentSectionEnd =
          currentSectionEnd - (currentTotalDuration - maxDuration);

        chorusEffectArr.push({
          filter: `atrim=duration=${currentSectionEnd}`,
          inputs: `${ffmpegSectionName}_split_${j}`,
          outputs: `${ffmpegSectionName}_trimmed_${j}`,
        });
      } else {
        chorusEffectArr.push({
          filter: "anull",
          inputs: `${ffmpegSectionName}_split_${j}`,
          outputs: `${ffmpegSectionName}_trimmed_${j}`,
        });
      }

      chorusEffectArr.push({
        filter: "asetpts=PTS-STARTPTS",
        inputs: `${ffmpegSectionName}_trimmed_${j}`,
        outputs: `${ffmpegSectionName}_trimmed_pts_${j}`,
      });

      if (j === 0) {
        chorusEffectArr.push({
          filter: "anull",
          inputs: `${ffmpegSectionName}_trimmed_pts_${j}`,
          outputs: `${ffmpegSectionName}_chorus_${j}`,
        });
      } else if (j === 1) {
        chorusEffectArr.push({
          filter: "chorus=0.7:0.9:55:0.4:0.25:2",
          inputs: `${ffmpegSectionName}_trimmed_pts_${j}`,
          outputs: `${ffmpegSectionName}_chorus_${j}`,
        });
      } else if (j === 2) {
        chorusEffectArr.push({
          filter: "chorus=0.6:0.9:50|60:0.4|0.32:0.25|0.4:2|1.3",
          inputs: `${ffmpegSectionName}_trimmed_pts_${j}`,
          outputs: `${ffmpegSectionName}_chorus_${j}`,
        });
      } else {
        chorusEffectArr.push({
          filter: "chorus=0.5:0.9:50|60|40:0.4|0.32|0.3:0.25|0.4|0.3:2|2.3|1.3",
          inputs: `${ffmpegSectionName}_trimmed_pts_${j}`,
          outputs: `${ffmpegSectionName}_chorus_${j}`,
        });
      }

      if (j === 0) {
        if (i === 0) {
          chorusEffectArr.push({
            filter: "afade=t=in:st=0:d=20",
            inputs: `${ffmpegSectionName}_chorus_${j}`,
            outputs: `${ffmpegSectionName}_chorus_time_set_${j}`,
          });
        } else {
          chorusEffectArr.push({
            filter: "anull",
            inputs: `${ffmpegSectionName}_chorus_${j}`,
            outputs: `${ffmpegSectionName}_chorus_time_set_${j}`,
          });
        }
      } else {
        // If last iteration
        if (j === numberOfLoops) {
          chorusEffectArr.push({
            filter: `afade=t=out:st=${duration - 5}:d=5`,
            inputs: `${ffmpegSectionName}_chorus_${j}`,
            outputs: `${ffmpegSectionName}_chorus_${j}_fade_out`,
          });

          chorusEffectArr.push({
            filter: `adelay=${sectionDelay}|${sectionDelay}`,
            inputs: `${ffmpegSectionName}_chorus_${j}_fade_out`,
            outputs: `${ffmpegSectionName}_chorus_time_set_${j}`,
          });
        } else {
          chorusEffectArr.push({
            filter: `adelay=${sectionDelay}|${sectionDelay}`,
            inputs: `${ffmpegSectionName}_chorus_${j}`,
            outputs: `${ffmpegSectionName}_chorus_time_set_${j}`,
          });
        }
      }

      chorusEffectArr.push({
        filter: "volume=2.8",
        inputs: `${ffmpegSectionName}_chorus_time_set_${j}`,
        outputs: `${ffmpegSectionName}_chorus_time_set_${j}_volume`,
      });

      allSplitSections.push(`${ffmpegSectionName}_split_${j}`);
      allTrimmedSections.push(
        `${ffmpegSectionName}_chorus_time_set_${j}_volume`
      );
    }

    const sectionNormalizedFilter = {
      filter: "loudnorm",
      inputs: `${ffmpegSectionName}_fade`,
      outputs: `${ffmpegSectionName}_normalized`,
    };

    const loopsFilters =
      numberOfLoops === 0
        ? [sectionNormalizedFilter]
        : [
            sectionNormalizedFilter,
            {
              filter: "asplit",
              options: allSplitSections.length.toString(),
              inputs: `${ffmpegSectionName}_normalized`,
              outputs: allSplitSections,
            },
            ...chorusEffectArr,
            {
              filter: `amix=inputs=${numberOfLoops + 1}`,
              inputs: allTrimmedSections,
              outputs: `${ffmpegSectionName}_concat`,
            },
          ];

    return [
      {
        filter: `atrim=start=${section.start}:end=${endTime}`,
        inputs: `vox:${i + 1}`,
        outputs: `${ffmpegSectionName}_initial`,
      },
      {
        filter: "asetpts=PTS-STARTPTS",
        inputs: `${ffmpegSectionName}_initial`,
        outputs: `${ffmpegSectionName}_pts`,
      },
      {
        filter: `atrim=duration=${maxDuration}`,
        inputs: `${ffmpegSectionName}_pts`,
        outputs: ffmpegSectionName,
      },
      numberOfLoops === 0
        ? // If first vocal section, fade in
          i === 0
          ? {
              // filter: `afade=t=in:st=5:d=5,afade=t=out:st=${duration - 3}:d=3`,
              // filter: `volume=-1:enable='between(t\,0\,1)',volume=-0.9:enable='between(t\,1\,2)',volume=-0.8:enable='between(t\,2\,3)',volume=-0.7:enable='between(t\,3\,4)',volume=-0.6:enable='between(t\,4\,5)',volume=-0.5:enable='between(t\,5\,6)',volume=-0.4:enable='between(t\,6\,7)',volume=-0.3:enable='between(t\,7\,8)',volume=-0.2:enable='between(t\,8\,9)',volume=-0.1:enable='between(t\,9\,10)',volume=0:enable='between(t\,10\,11)'`,
              // filter: `volume=0.05:enable='between(t\,0\,1)',volume=0.1:enable='between(t\,1\,2)',volume=0.15:enable='between(t\,2\,3)',volume=0.2:enable='between(t\,3\,4)',volume=0.3:enable='between(t\,4\,5)',volume=0.4:enable='between(t\,5\,6)',volume=0.5:enable='between(t\,6\,7)',volume=0.6:enable='between(t\,7\,8)',volume=0.7:enable='between(t\,8\,9)'`,
              filter: `volume=enable='between(t,0,10)':volume='0+(0.1*t)':eval=frame`,
              inputs: ffmpegSectionName,
              outputs: `${ffmpegSectionName}_fade`,
            }
          : // Otherwise, fade out
          i === arr.length - 1
          ? {
              filter: `afade=t=out:st=${duration - 5}:d=5`,
              inputs: ffmpegSectionName,
              outputs: `${ffmpegSectionName}_fade`,
            }
          : {
              filter: `afade=t=out:st=${duration - 3}:d=3`,
              inputs: ffmpegSectionName,
              outputs: `${ffmpegSectionName}_fade`,
            }
        : {
            filter: "anull",
            inputs: ffmpegSectionName,
            outputs: `${ffmpegSectionName}_fade`,
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
