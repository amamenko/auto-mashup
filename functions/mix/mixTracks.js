const ffmpeg = require("fluent-ffmpeg");
const timeStampToSeconds = require("../utils/timeStampToSeconds");
const path = require("path");

const mixTracks = (song1, song2) => {
  // Object.filter = (obj, predicate) =>
  //   Object.keys(obj)
  //     .filter((key) => predicate(obj[key]))
  //     .reduce((res, key) => ((res[key] = obj[key]), res), {});
  // ffmpeg.getAvailableFilters(function (err, filters) {
  //   console.log("Available filters:");
  //   if (filters) {
  //     var filtered = Object.filter(
  //       filters,
  //       (filter) => filter.input === "audio"
  //     );
  //     console.dir(filtered);
  //   }
  // });
  const start = Date.now();

  const createComplexFilter = () => {
    const vocalsKeyScale = song2.keyScaleFactor;
    const vocalsTempoScale = song2.tempoScaleFactor;
    const findClosestBeat = (seconds) => {
      const beats = song2.beats;
      const closest = beats.reduce((a, b) => {
        return Math.abs(b - seconds) < Math.abs(a - seconds) ? b : a;
      });
      return closest;
    };

    function getClosestBeatArr(section, index, arr) {
      const song = this;
      const nextSection = arr[index + 1];
      const startTime = findClosestBeat(timeStampToSeconds(section.start));
      const nextSectionStartTime = nextSection
        ? findClosestBeat(timeStampToSeconds(nextSection.start))
        : song.duration;
      return {
        start: startTime,
        duration: nextSectionStartTime - startTime,
        sectionName: section.sectionName,
      };
    }

    const instrumentalSections = song1.sections.map(getClosestBeatArr, song1);
    const vocalSections = song2.sections.map(getClosestBeatArr, song2);
    const matchedVocalSections = [];
    for (const vocalSection of vocalSections) {
      for (const instrumentalSection of instrumentalSections) {
        if (vocalSection.sectionName === instrumentalSection.sectionName) {
          matchedVocalSections.push({
            ...vocalSection,
            instrumentalSection,
          });
        }
      }
    }

    // const introSections = "intro";
    // const verseSections = ["verse", "verso", "refrain", "refrán"];
    // const preChorusSections = ["pre-chorus", "pre-coro"];
    // const chorusSections = ["chorus", "coro"];
    // const postChorusSections = ["post-chorus", "post-coro"];
    // const bridgeSections = ["bridge", "puente"];
    // const outroSections = "outro";
    // for (let i = 0; i < matchedVocalSections.length; i++) {
    //   const currentSection = matchedVocalSections[i];
    //   const nextSection = matchedVocalSections[i + 1];
    //   const matchingInstrumentalSection = instrumentalSections.find(
    //     (section) => section.name === currentSection.name
    //   );
    //   const associatedVocalSectionIndex = vocalSections.findIndex(
    //     (section) => section.sectionName === currentSection.sectionName
    //   );
    //   if (associatedVocalSectionIndex >= 0) {
    //     if (currentSection.duration < matchingInstrumentalSection.duration) {
    //       // There's time left to cover for vocal section, let's potentially add more
    //       const nextVocalsSection =
    //         vocalSections[associatedVocalSectionIndex + 1];
    //       if (nextVocalsSection) {
    //         if (nextVocalsSection.sectionName !== nextSection.sectionName) {
    //           // TODO: Add section matching
    //         }
    //       }
    //     }
    //   }
    // }
    const associatedInstrumentalSectionDelays = [];
    const trimmedSections = matchedVocalSections.map((section, i, arr) => {
      const nextSection = arr[i + 1];
      const instrumentalSection = section.instrumentalSection;
      const delay = instrumentalSection.start;
      const maxDuration = instrumentalSection.duration;
      associatedInstrumentalSectionDelays.push(delay);
      const startTime = section.start;
      let endTime = nextSection
        ? nextSection.start
          ? nextSection.start
          : song2.duration
        : song2.duration;
      const defaultDuration = endTime - startTime;
      if (defaultDuration > maxDuration) {
        endTime = startTime + maxDuration;
      }
      return {
        filter: `atrim=start=${section.start}:end=${endTime}`,
        inputs: `vox_${i}`,
        outputs: `${section.sectionName}`.replace(" ", "_"),
      };
    });
    const voxOutputNamesArr = trimmedSections.map((item) => item.outputs);

    const delays = associatedInstrumentalSectionDelays
      .map((delay) => delay * 1000)
      .join("|");

    // TODO: Add delay filters for each individual section
    const delayFilter = {
      filter: "adelay=0",
      input: "input_1",
      outputs: "input_1_delayed",
    };

    const getRubberbandFilter = (num) => {
      return {
        filter: `rubberband=pitch=${vocalsKeyScale}:tempo=${vocalsTempoScale}:formant=preserved`,
        inputs: `${num}:a`,
        outputs: `vox_${num}`,
      };
    };
    const rubberbandFiltersArr = [...Array(song2.sections.length).keys()]
      .map(getRubberbandFilter)
      .slice(0, trimmedSections.length);

    const complexFilter = [
      // Apply vocal pitching / tempo scaling adjustments
      ...rubberbandFiltersArr,
      ...trimmedSections,
      delayFilter,
      // Mix instrumentals and pitched vocal sections together
      {
        filter: `amix=inputs=${1 + rubberbandFiltersArr.length}:duration=first`,
        inputs: ["0:a", ...voxOutputNamesArr],
      },
    ];

    return complexFilter;
  };
  if (song1 && song2) {
    const accompaniment = song1.accompaniment.fields.file.url;
    const vocals = song2.vocals.fields.file.url;
    if (accompaniment && vocals) {
      const command = ffmpeg();
      const accompanimentLink = "https:" + accompaniment;
      const vocalsLink = "https:" + vocals;
      const audioFiles = [
        accompanimentLink,
        ...Array(song2.sections.length).fill(vocalsLink),
      ];
      audioFiles.forEach((fileName) => {
        command.input(fileName);
      });
      command
        .complexFilter(createComplexFilter())
        .output("./output1.mp3")
        .on("error", (err, stdout, stderr) => {
          console.log(
            `FFMPEG received an error when attempting to mix the instrumentals of the track "${song1.title}" by ${song1.artist} with the vocals of the track "${song2.title}" by ${song2.artist}. Terminating process. Output: ` +
              err.message
          );
          return;
        })
        .on("progress", (progress) => {
          console.log("Processing: " + progress.percent + "% done");
        })
        .on("end", () => {
          console.log(
            `\nDone in ${
              (Date.now() - start) / 1000
            }s\nSuccessfully mixed the instrumentals of the track "${
              song1.title
            }" by ${song1.artist} with the vocals of the track "${
              song2.title
            }" by ${song2.artist}.\nSaved to output1.mp3.`
          );
        })
        .run();
    }
  }
};

module.exports = mixTracks;
