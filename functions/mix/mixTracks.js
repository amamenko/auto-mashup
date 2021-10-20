const ffmpeg = require("fluent-ffmpeg");
const timeStampToSeconds = require("../utils/timeStampToSeconds");
const path = require("path");

const mixTracks = (song1, song2) => {
  const start = Date.now();

  const createComplexFilter = () => {
    const vocalsKeyScale = song2.keyScaleFactor;
    const vocalsTempoScale = song2.tempoScaleFactor;

    const findClosestBeat = (seconds, song) => {
      const beats = song.beats;
      const closest = beats.reduce((a, b) => {
        return Math.abs(b - seconds) < Math.abs(a - seconds) ? b : a;
      });
      return closest;
    };

    function getClosestBeatArr(section, index, arr) {
      const song = this;
      const nextSection = arr[index + 1];
      const startTime = findClosestBeat(
        timeStampToSeconds(section.start),
        song
      );
      const nextSectionStartTime = nextSection
        ? findClosestBeat(timeStampToSeconds(nextSection.start), song)
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

    for (const instrumentalSection of instrumentalSections) {
      for (const vocalSection of vocalSections) {
        const introSections = ["intro"];
        const verseSections = ["verse", "verso", "refrain", "refrán"];
        const preChorusSections = ["pre-chorus", "pre-coro"];
        const chorusSections = ["chorus", "coro"];
        const postChorusSections = ["post-chorus", "post-coro"];
        const bridgeSections = ["bridge", "puente"];
        const outroSections = ["outro"];

        const generalVocalSection = vocalSection.sectionName.split(" ")[0];
        const vocalSectionNumber = vocalSection.sectionName.split(" ")[1];
        const generalInstrumentalSection =
          instrumentalSection.sectionName.split(" ")[0];
        const instrumentalNumber =
          instrumentalSection.sectionName.split(" ")[1];

        const bothMatch = (section) => {
          return (
            section.some((item) => item === generalVocalSection) &&
            section.some((item) => item === generalInstrumentalSection) &&
            vocalSectionNumber === instrumentalNumber
          );
        };

        const introMatch = bothMatch(introSections);
        const verseMatch = bothMatch(verseSections);
        const preChorusMatch = bothMatch(preChorusSections);
        const chorusMatch = bothMatch(chorusSections);
        const postChorusMatch = bothMatch(postChorusSections);
        const bridgeMatch = bothMatch(bridgeSections);
        const outroMatch = bothMatch(outroSections);

        if (
          introMatch ||
          verseMatch ||
          preChorusMatch ||
          chorusMatch ||
          postChorusMatch ||
          bridgeMatch ||
          outroMatch ||
          vocalSection.sectionName === instrumentalSection.sectionName
        ) {
          matchedVocalSections.push({
            ...vocalSection,
            instrumentalSection: {
              ...instrumentalSection,
            },
          });
        }
      }
    }

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
          : song2.duration
        : song2.duration;

      const defaultDuration = endTime - startTime;

      if (defaultDuration > maxDuration) {
        endTime = startTime + maxDuration;
      }

      const ffmpegSectionName = `${section.sectionName}`.replace(" ", ":");

      return [
        {
          filter: `atrim=start=${section.start}:end=${endTime}`,
          inputs: `vox:${i}`,
          outputs: ffmpegSectionName,
        },
        {
          filter: `adelay=${delay * 10000}`,
          inputs: ffmpegSectionName,
          outputs: `${ffmpegSectionName}_delayed`,
        },
      ];
    });

    const voxOutputNamesArr = trimmedSections.map((item) => item[1].outputs);

    const getRubberbandFilter = (num) => {
      return {
        filter: `rubberband=pitch=${vocalsKeyScale}:tempo=${vocalsTempoScale}:formant=preserved`,
        inputs: `${num}:a`,
        outputs: `vox:${num}`,
      };
    };

    const rubberbandFiltersArr = [...Array(song2.sections.length).keys()]
      .map(getRubberbandFilter)
      .slice(0, trimmedSections.length);

    const complexFilter = [
      // Apply vocal pitching / tempo scaling adjustments
      ...rubberbandFiltersArr,
      // Apply section trimming and appropriate time delays to vox
      ...trimmedSections.flat(),
      // Mix instrumentals and pitched vocal sections together
      {
        filter: `amix=inputs=${1 + rubberbandFiltersArr.length}:duration=first`,
        inputs: ["0:a", ...voxOutputNamesArr],
      },
    ];

    console.log({ complexFilter });
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
        if (fileName !== accompanimentLink) {
          command.input(fileName);
        }
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
