const ffmpeg = require("fluent-ffmpeg");
const createComplexFilter = require("./createComplexFilter");
const fs = require("fs");

const mixTracks = (instrumentals, vox, accompanimentModPath, voxModPath) => {
  const start = Date.now();

  const command = ffmpeg();

  const audioFiles = [
    accompanimentModPath,
    ...Array(instrumentals.sections.length).fill(voxModPath),
  ];

  audioFiles.forEach((fileName) => {
    command.input(fileName);
  });

  command
    .complexFilter(createComplexFilter(instrumentals, vox))
    .output("./output1.mp3")
    .on("error", (err, stdout, stderr) => {
      console.log(
        `FFMPEG received an error when attempting to mix the instrumentals of the track "${instrumentals.title}" by ${instrumentals.artist} with the vocals of the track "${vox.title}" by ${vox.artist}. Terminating process. Output: ` +
          err.message
      );
      console.log("FFMPEG output:\n" + stdout);
      console.log("FFMPEG stderr:\n" + stderr);
      fs.rmdirSync("./functions/mix/inputs", { recursive: true, force: true });
      console.log("Audio MP3 inputs directory deleted!");
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

      fs.rmdirSync("./functions/mix/inputs", { recursive: true, force: true });
      console.log("Audio MP3 inputs directory deleted!");
    })
    .run();
};

module.exports = mixTracks;
