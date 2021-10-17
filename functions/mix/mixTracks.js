const ffmpeg = require("fluent-ffmpeg");

const mixTracks = (song1, song2) => {
  const start = Date.now();

  const timeStampToSeconds = (timestramp) => {
    const timeArr = timestramp.split(":").map((item) => Number(item));

    let totalSeconds = 0;

    totalSeconds += timeArr[0] * 3600;
    totalSeconds += timeArr[1] * 60;
    totalSeconds += timeArr[2];

    return totalSeconds;
  };

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

    const sections = song2.sections.map((item) => {
      return {
        start: findClosestBeat(timeStampToSeconds(item.start)),
        sectionName: item.sectionName,
      };
    });

    const trimmedSections = sections.map((section, i, arr) => {
      const nextSection = arr[i + 1];

      return {
        filter: `atrim=start=${section.start}:end=${
          nextSection
            ? nextSection.start
              ? nextSection.start
              : song2.duration
            : song2.duration
        }`,
        inputs: "vox",
        output: `${section.sectionName}`.replace(" ", "_"),
      };
    });

    console.log(trimmedSections);

    const complexFilter = [
      // Apply vocal pitching / tempo scaling adjustments
      {
        filter: `rubberband=pitch=${vocalsKeyScale}:tempo=${vocalsTempoScale}:formant=preserved`,
        inputs: "1:a",
        outputs: "vox",
      },
      ...trimmedSections,
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
