const ffmpeg = require("fluent-ffmpeg");

const mixTracks = () => {
  const start = Date.now();

  ffmpeg()
    .input("")
    .output("./output.mp4")
    .on("progress", (p) => {
      console.log(`${p.targetSize}kb downloaded`);
    })
    .on("end", () => {
      console.log(
        `\nDone in ${(Date.now() - start) / 1000}s\nSaved to output.mp4.`
      );
    })
    .on("error", function (err) {
      console.log("Process exited with error: " + err);
    })
    .run();
};

module.exports = mixTracks;
