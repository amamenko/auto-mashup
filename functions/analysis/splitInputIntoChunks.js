const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const checkFileExists = require("../utils/checkFileExists");
const { spleeterOnChunks } = require("./spleeterOnChunks");

const splitInputIntoChunks = async () => {
  console.log("Splitting input into chunks");

  const start = Date.now();

  const removeExtraneousChunk = async () => {
    const chunkExists = await checkFileExists(
      path.resolve(__dirname, "./chunk.mp3")
    );

    if (chunkExists) {
      fs.rmSync(path.resolve(__dirname, "./chunk.mp3"), {
        recursive: true,
        force: true,
      });
    }
  };

  const checkIfOutputExists = async () => {
    return await checkFileExists(path.resolve(__dirname, "./output"));
  };

  const initialOutputExists = await checkIfOutputExists();

  if (!initialOutputExists) {
    fs.mkdirSync(path.resolve(__dirname, "./output"));
  }

  ffmpeg("YouTubeAudio.mp3")
    .addOutputOption(
      "-f",
      "segment",
      "-segment_time",
      "15",
      "-c",
      "copy",
      "./functions/analysis/output/chunk%03d.mp3"
    )
    // Need an output for fluent-ffmpeg
    .output(path.resolve(__dirname, "./chunk.mp3"))
    .on("progress", (progress) => {
      console.log("Processing: " + progress.percent + "% done");
    })
    .on("end", async () => {
      removeExtraneousChunk();

      const outputStillExists = await checkIfOutputExists();

      if (outputStillExists) {
        const numberOfChunks = fs.readdirSync(
          path.resolve(__dirname, "./output")
        ).length;

        console.log(
          `\nDone in ${
            (Date.now() - start) / 1000
          }s\nSuccessfully segmented YouTubeAudio.mp3 into ${numberOfChunks} chunks.`
        );

        spleeterOnChunks(numberOfChunks);
      }

      return;
    })
    .on("error", async (err) => {
      console.error(err);

      removeExtraneousChunk();

      const outputStillExists = await checkIfOutputExists();

      if (outputStillExists) {
        fs.rmSync(path.resolve(__dirname, "./output"), {
          recursive: true,
          force: true,
        });
      }
    })
    .run();
};

module.exports = { splitInputIntoChunks };
