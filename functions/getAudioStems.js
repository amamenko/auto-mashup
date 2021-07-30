const fs = require("fs");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const { PythonShell } = require("python-shell");

const getAudioStems = async (videoID) => {
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
        "./python_scripts/install_package.py",
        { args: ["spleeter"] },
        (err) => {
          if (err) {
            throw err;
          } else {
            console.log("Splitting audio file.");

            // Split audio into stems and clean up
            PythonShell.run(
              "./python_scripts/spleeter_stems.py",
              {
                args: [filePath],
              },
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

module.exports = getAudioStems;
