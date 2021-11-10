const ffmpeg = require("fluent-ffmpeg");
const checkFileExists = require("../utils/checkFileExists");
const fs = require("fs");
const getClosestBeatArr = require("./getClosestBeatArr");

const trimResultingMix = async (instrumentals) => {
  const mp3Exists = await checkFileExists("original_mix.mp3");

  if (mp3Exists) {
    if (instrumentals) {
      const instrumentalSections = instrumentals.sections.map(
        getClosestBeatArr,
        instrumentals
      );

      const mixStart = instrumentalSections[0].start;
      const mixLastSection = instrumentalSections.find(
        (section) => section.start - mixStart >= 80
      );
      const mixEnd = mixLastSection
        ? mixLastSection.start
        : instrumentalSections[instrumentalSections.length - 1].start;

      const start = Date.now();

      ffmpeg("original_mix.mp3")
        .output("./trimmed_mix.mp3")
        .audioFilters(`atrim=start=${mixStart}:end=${mixEnd}`)
        .on("error", async (err, stdout, stderr) => {
          console.log(
            `FFMPEG received an error when attempting to mix the instrumentals of the track "${instrumentals.title}" by ${instrumentals.artist} with the vocals of the track "${vox.title}" by ${vox.artist}. Terminating process. Output: ` +
              err.message
          );

          console.log("FFMPEG stdout:\n" + stdout);
          console.log("FFMPEG stderr:\n" + stderr);

          const originalOutputExists = await checkFileExists(
            "original_mix.mp3"
          );

          if (originalOutputExists) {
            fs.rm(
              "original_mix.mp3",
              {
                recursive: true,
                force: true,
              },
              () => console.log("Original original_mix.mp3 file deleted!")
            );
          }

          const leftoverOutputExists = await checkFileExists("trimmed_mix.mp3");

          if (leftoverOutputExists) {
            fs.rm(
              "trimmed_mix.mp3",
              {
                recursive: true,
                force: true,
              },
              () => console.log("Leftover trimmed_mix.mp3 file deleted!")
            );
          }

          return;
        })
        .on("progress", (progress) => {
          console.log(
            "Processing: " +
              (progress.percent ? progress.percent : "0") +
              "% done"
          );
        })
        .on("end", async () => {
          console.log(
            `\nDone in ${
              (Date.now() - start) / 1000
            }s\nSuccessfully trimmed original MP3 file.\nSaved to trimmed_mix.mp3.`
          );

          const originalOutputExists = await checkFileExists(
            "original_mix.mp3"
          );

          if (originalOutputExists) {
            fs.rm(
              "original_mix.mp3",
              {
                recursive: true,
                force: true,
              },
              () => console.log("Original original_mix.mp3 file deleted!")
            );
          }

          return;
        })
        .run();
    } else {
      console.log("No instrumental sections available!");
      return;
    }
  } else {
    console.log("No original_mix.mp3 file available to trim!");
    return;
  }
};

module.exports = trimResultingMix;
