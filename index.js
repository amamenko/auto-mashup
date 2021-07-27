const express = require("express");
const app = express();
const fs = require("fs");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");

const port = process.env.PORT || 4000;

let { PythonShell } = require("python-shell");
const packageName = "spleeter";

const options = {
  args: [packageName],
};

const getYouTubeAudio = async (videoID) => {
  const basicInfo = await ytdl.getBasicInfo(videoID);

  if (basicInfo) {
    if (basicInfo.videoDetails) {
      const title = basicInfo.videoDetails.title;
      console.log(`Now downloading video: ${title}`);
    }
  }

  // Download audio from YouTube
  let stream = ytdl(videoID, {
    quality: "highestaudio",
  });

  const filePath = "YouTubeAudio.mp3";

  let start = Date.now();
  ffmpeg(stream)
    .audioBitrate(128)
    .save(filePath)
    .on("progress", (p) => {
      console.log(`${p.targetSize}kb downloaded`);
    })
    .on("end", () => {
      console.log(
        `\nDone in ${(Date.now() - start) / 1000}s\nSaved to ${filePath}.`
      );

      // Make sure Spleeter is installed
      PythonShell.run(
        "./python_scripts/install_spleeter.py",
        options,
        (err) => {
          if (err) {
            throw err;
          } else {
            console.log("Splitting audio file.");
            // Get audio file
            const spleeterOptions = {
              args: [filePath],
            };

            // Split audio into stems and clean up
            PythonShell.run(
              "./python_scripts/spleeter_stems.py",
              spleeterOptions,
              (err) => {
                if (err) {
                  throw err;
                } else {
                  console.log("Successfully split track into two stems");
                  fs.unlinkSync(filePath);
                  fs.rmSync("pretrained_models", { recursive: true });
                  console.log(
                    "Removed pretrained_models directory and local audio file"
                  );
                }
              }
            );
          }
        }
      );
    });
};

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
