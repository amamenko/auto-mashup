const ffmpeg = require("fluent-ffmpeg");
const timeStampToSeconds = require("../utils/timeStampToSeconds");
const path = require("path");
const {
  introSections,
  verseSections,
  preChorusSections,
  chorusSections,
  postChorusSections,
  bridgeSections,
  outroSections,
} = require("../arrays/songSectionsArr");
const removeAccents = require("remove-accents");

const mixTracks = (instrumentals, vox) => {
  const start = Date.now();

  const createComplexFilter = () => {
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

      // Round down one beat
      return beats[indexClosest - 1];
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

    const instrumentalSections = instrumentals.sections.map(
      getClosestBeatArr,
      instrumentals
    );
    const vocalSections = vox.sections.map(getClosestBeatArr, vox);
    const matchedVocalSections = [];

    for (const instrumentalSection of instrumentalSections) {
      for (const vocalSection of vocalSections) {
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
          if (
            !matchedVocalSections.some(
              (item) =>
                item.instrumentalSection.start === instrumentalSection.start
            )
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
          filter: "aloop=loop=1:size=32767:start=32767",
          inputs: ffmpegSectionName,
          outputs: `loop${i + 1}`,
        },
        // {
        //   filter: `atrim=end=${maxDuration}`,
        //   inputs: `loop${i + 1}`,
        //   outputs: `${ffmpegSectionName}${i + 1}`,
        // },
        {
          filter: "loudnorm",
          inputs: `loop${i + 1}`,
          outputs: `${i + 1}_normalized`,
        },
        {
          filter: `adelay=${relativeDelay}|${relativeDelay}`,
          inputs: `${i + 1}_normalized`,
          outputs: `${ffmpegSectionName}_delayed`,
        },
      ];
    });

    const voxOutputNamesArr = trimmedSections.map((item) => item[3].outputs);

    const getRubberbandFilter = (num) => {
      const audioInputNum = num + 1;

      return [
        {
          filter: "volume=3.5",
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

  if (instrumentals && vox) {
    const accompaniment = instrumentals.accompaniment.fields.file.url;
    const vocals = vox.vocals.fields.file.url;

    if (accompaniment && vocals) {
      const command = ffmpeg();
      const accompanimentLink = "https:" + accompaniment;
      const vocalsLink = "https:" + vocals;

      const audioFiles = [
        accompanimentLink,
        ...Array(instrumentals.sections.length).fill(vocalsLink),
      ];

      audioFiles.forEach((fileName) => {
        command.input(fileName);
      });

      command
        .complexFilter(createComplexFilter())
        .output("./output1.mp3")
        .on("error", (err, stdout, stderr) => {
          console.log(
            `FFMPEG received an error when attempting to mix the instrumentals of the track "${instrumentals.title}" by ${instrumentals.artist} with the vocals of the track "${vox.title}" by ${vox.artist}. Terminating process. Output: ` +
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
              instrumentals.title
            }" by ${instrumentals.artist} with the vocals of the track "${
              vox.title
            }" by ${vox.artist}.\nSaved to output1.mp3.`
          );
        })
        .run();
    }
  }
};

module.exports = mixTracks;
