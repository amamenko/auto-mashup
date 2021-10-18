const ffmpeg = require("fluent-ffmpeg");
const timeStampToSeconds = require("../utils/timeStampToSeconds");

const mixTracks = (song1, song2) => {
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
          matchedVocalSections.push(vocalSection);
        }
      }
    }

    const introSections = "intro";
    const verseSections = ["verse", "verso", "refrain", "refrán"];
    const preChorusSections = ["pre-chorus", "pre-coro"];
    const chorusSections = ["chorus", "coro"];
    const postChorusSections = ["post-chorus", "post-coro"];
    const bridgeSections = ["bridge", "puente"];
    const outroSections = "outro";

    for (let i = 0; i < matchedVocalSections.length; i++) {
      const currentSection = matchedVocalSections[i];
      const nextSection = matchedVocalSections[i + 1];
      const matchingInstrumentalSection = instrumentalSections.find(
        (section) => section.name === currentSection.name
      );
      const associatedVocalSectionIndex = vocalSections.findIndex(
        (section) => section.sectionName === currentSection.sectionName
      );

      if (associatedVocalSectionIndex >= 0) {
        if (currentSection.duration < matchingInstrumentalSection.duration) {
          // There's time left to cover for vocal section, let's potentially add more
          const nextVocalsSection =
            vocalSections[associatedVocalSectionIndex + 1];

          if (nextVocalsSection) {
            if (nextVocalsSection.sectionName !== nextSection.sectionName) {
              // TODO: Add section matching
            }
          }
        }
      }
    }

    console.log({
      song1: song1.sections,
      instrumentalSections,
      matchedVocalSections,
    });

    // const trimmedSections = matchedVocalSections.map((section, i, arr) => {
    //   const nextSection = arr[i + 1];

    //   return {
    //     filter: `atrim=start=${section.start}:end=${
    //       nextSection
    //         ? nextSection.start
    //           ? nextSection.start
    //           : song2.duration
    //         : song2.duration
    //     }`,
    //     inputs: "vox",
    //     output: `${section.sectionName}`.replace(" ", "_"),
    //   };
    // });

    // console.log(trimmedSections);

    const complexFilter = [
      // Apply vocal pitching / tempo scaling adjustments
      {
        filter: `rubberband=pitch=${vocalsKeyScale}:tempo=${vocalsTempoScale}:formant=preserved`,
        inputs: "1:a",
        outputs: "vox",
      },
      // ...trimmedSections,
      // Mix instrumentals and pitched vocals together
      {
        filter: "amix=inputs=2:duration=first",
        inputs: ["0:a", "vox"],
      },
    ];

    // return complexFilter;
  };

  createComplexFilter();

  // if (song1 && song2) {
  //   const accompaniment = song1.accompaniment.fields.file.url;
  //   const vocals = song2.vocals.fields.file.url;

  //   if (accompaniment && vocals) {
  //     ffmpeg()
  //       .input("https:" + accompaniment)
  //       .input("https:" + vocals)
  //       .input(process.env.SILENCE_SOURCE)
  //       .complexFilter(createComplexFilter())
  //       .output("./output1.mp3")
  //       .on("error", (err, stdout, stderr) => {
  //         console.log(
  //           `FFMPEG received an error when attempting to mix the instrumentals of the track "${song1.title}" by ${song1.artist} with the vocals of the track "${song2.title}" by ${song2.artist}. Terminating process. Output: ` +
  //             err.message
  //         );
  //         return;
  //       })
  //       .on("end", () => {
  //         console.log(
  //           `\nDone in ${
  //             (Date.now() - start) / 1000
  //           }s\nSuccessfully mixed the instrumentals of the track "${
  //             song1.title
  //           }" by ${song1.artist} with the vocals of the track "${
  //             song2.title
  //           }" by ${song2.artist}.\nSaved to output1.mp3.`
  //         );
  //       })
  //       .run();
  //   }
  // }
};

module.exports = mixTracks;
