const fs = require("fs");
const axios = require("axios");
const { PythonShell } = require("python-shell");
const getBeatPositions = require("./getBeatPositions");
const esPkg = require("essentia.js");
const essentia = new esPkg.Essentia(esPkg.EssentiaWASM);
const MP3Cutter = require("../mp3Cutter/cutter");
const sendDataToContentful = require("../contentful/sendDataToContentful");

const getAudioStems = async (
  videoID,
  matchTitle,
  matchDuration,
  matchArr,
  trackDataJSON
) => {
  console.log(`Now downloading video: ${matchTitle}`);

  const mp3Link = await axios
    .get(`https://www.yt-download.org/api/button/mp3/${videoID}}`)
    .then((res) => res.data)
    .then((data) => data.split('<a href="')[1].split('" class="shadow-xl')[0]);

  const start = Date.now();

  const filePath = "YouTubeAudio.mp3";

  const writer = fs.createWriteStream(filePath);

  const response = await axios({
    url: mp3Link,
    method: "GET",
    responseType: "stream",
  });

  response.data.pipe(writer);

  response.data.on("error", (err) => {
    console.log(
      "Received an error when attempting to download YouTube video audio. Terminating process. Output: " +
        err
    );
    return;
  });

  response.data.on("end", () => {
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
                    trackDataJSON
                      ? trackDataJSON.tempo
                        ? trackDataJSON.tempo
                        : null
                      : null
                  );

                  if (beats) {
                    if (beats.ticks) {
                      const beatPositions = essentia.vectorToArray(beats.ticks);
                      const roundedBeatPositions = [...beatPositions].map(
                        (item) => Number(item.toFixed(4))
                      );

                      if (matchDuration > 360) {
                        MP3Cutter.cut({
                          src: "output/YouTubeAudio/accompaniment.mp3",
                          target:
                            "output/YouTubeAudio/accompaniment_trimmed.mp3",
                          start: 0,
                          // Keep total track time at 6 minutes maximum to keep file at ~6 MB
                          end: 360,
                          callback: () =>
                            MP3Cutter.cut({
                              src: "output/YouTubeAudio/vocals.mp3",
                              target: "output/YouTubeAudio/vocals_trimmed.mp3",
                              start: 0,
                              // Keep total track time at 6 minutes maximum to keep file at ~6 MB
                              end: 360,
                              callback: () =>
                                sendDataToContentful(
                                  trackDataJSON,
                                  360,
                                  matchArr,
                                  roundedBeatPositions,
                                  "trimmed"
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
                    } else {
                      console.log("No beat ticks returned from analysis!");
                    }
                  } else {
                    console.log("No beats returned from analysis!");
                  }
                };

                return getBeatPositions(beatSuccessCallback);
              }
            }
          );
        }
      }
    );
  });
};

module.exports = getAudioStems;
