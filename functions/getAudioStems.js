const fs = require("fs");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const { PythonShell } = require("python-shell");
const getBeatPositions = require("./getBeatPositions");
const esPkg = require("essentia.js");
const essentia = new esPkg.Essentia(esPkg.EssentiaWASM);
const MP3Cutter = require("./mp3Cutter/cutter");
const sendDataToContentful = require("./sendDataToContentful");

const getAudioStems = async (
  videoID,
  matchDuration,
  matchArr,
  trackDataJSON
) => {
  const reqOptions = {
    requestOptions: {
      headers: {
        cookie: process.env.YOUTUBE_COOKIES,
      },
    },
  };

  const basicInfo = await ytdl.getBasicInfo(videoID, reqOptions);

  if (basicInfo) {
    if (basicInfo.videoDetails) {
      const title = basicInfo.videoDetails.title;
      console.log(`Now downloading video: ${title}`);
    }
  }

  // Download audio from YouTube
  let stream = ytdl(videoID, {
    quality: "highestaudio",
    ...reqOptions,
  });

  const filePath = "YouTubeAudio.wav";

  const start = Date.now();

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

                  // Get beat positions from accompaniment track
                  const beatSuccessCallback = async (buffer) => {
                    // Convert the JS float32 typed array into std::vector<float>
                    const inputSignalVector = await essentia.arrayToVector(
                      buffer.getChannelData(0)
                    );

                    const beats = await essentia.BeatTrackerMultiFeature(
                      inputSignalVector,
                      tempo
                    );

                    const beatPositions = essentia.vectorToArray(beats.ticks);
                    const roundedBeatPositions = [...beatPositions].map(
                      (item) => Number(item.toFixed(4))
                    );

                    if (matchDuration > 360) {
                      MP3Cutter.cut({
                        src: "output/YouTubeAudio/accompaniment.mp3",
                        target: "output/YouTubeAudio/accompaniment_cut.mp3",
                        start: 0,
                        // Keep total track time at 6 minutes maximum to keep file at ~6 MB
                        end: 360,
                        callback: () =>
                          MP3Cutter.cut({
                            src: "output/YouTubeAudio/vocals.mp3",
                            target: "output/YouTubeAudio/vocals_cut.mp3",
                            start: 0,
                            // Keep total track time at 6 minutes maximum to keep file at ~6 MB
                            end: 360,
                            callback: () =>
                              sendDataToContentful(
                                trackDataJSON,
                                360,
                                matchArr,
                                roundedBeatPositions
                              ),
                          }),
                      });
                    } else {
                      sendDataToContentful(
                        trackDataJSON,
                        matchDuration,
                        matchArr,
                        roundedBeatPositions
                      );
                    }
                  };

                  getBeatPositions(beatSuccessCallback);
                }
              }
            );
          }
        }
      );
    });
};

module.exports = getAudioStems;
