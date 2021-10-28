const ffmpeg = require("fluent-ffmpeg");
const createComplexFilter = require("./createComplexFilter");

const mixTracks = (instrumentals, vox) => {
  const start = Date.now();

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
        .complexFilter(createComplexFilter(instrumentals, vox))
        .output("./output1.mp3")
        .on("error", (err, stdout, stderr) => {
          console.log(
            `FFMPEG received an error when attempting to mix the instrumentals of the track "${instrumentals.title}" by ${instrumentals.artist} with the vocals of the track "${vox.title}" by ${vox.artist}. Terminating process. Output: ` +
              err.message
          );
          console.log("FFMPEG output:\n" + stdout);
          console.log("FFMPEG stderr:\n" + stderr);
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
