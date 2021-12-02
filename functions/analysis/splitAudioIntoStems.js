const fs = require("fs");
const { PythonShell } = require("python-shell");
const getBeatPositions = require("./getBeatPositions");
const esPkg = require("essentia.js");
const exec = require("child_process").exec;
const kill = require("tree-kill");
const { beatSuccessCallback } = require("./beatSuccessCallback");
const { logger } = require("../logger/initializeLogger");
const path = require("path");
require("dotenv").config();
let essentia;

if (esPkg.EssentiaWASM) {
  essentia = new esPkg.Essentia(esPkg.EssentiaWASM);
}

const splitAudioIntoStems = (
  matchID,
  matchDuration,
  matchExpected,
  matchArr,
  trackDataJSON
) => {
  const filePath = "YouTubeAudio.mp3";

  // Make sure Spleeter is installed
  PythonShell.run(
    "./python_scripts/install_package.py",
    { args: ["spleeter"] },
    (err) => {
      if (err) {
        throw err;
      } else {
        // Split audio into stems and clean up
        const spleeterScript = exec(
          `bash ./functions/analysis/spleeter-wrapper.sh -f ${filePath} --stems 2 --process_codec M4A`
        );

        // If spleeter script isn't done splitting in 3 minutes and 30 seconds, kill process and clean up
        const killSpleeter = setTimeout(async () => {
          if (spleeterScript.pid) {
            kill(spleeterScript.pid);
            const tooLongStatement =
              "Spleeter bash script ran over 3 minutes and 30 seconds. Process killed. Moving on to next song!";

            if (process.env.NODE_ENV === "production") {
              logger.log(tooLongStatement);
            } else {
              console.log(tooLongStatement);
            }

            const youtubeTrimmedAudioFileExists = await checkFileExists(
              filePath
            );

            if (youtubeTrimmedAudioFileExists) {
              fs.rmSync(filePath, {
                recursive: true,
                force: true,
              });
            }

            const outputDirectoryExists = await checkFileExists(
              path.resolve(__dirname, "../../output")
            );

            if (outputDirectoryExists) {
              fs.rmSync(path.resolve(__dirname, "../../output"), {
                recursive: true,
                force: true,
              });
            }

            return;
          }
        }, 210000);

        spleeterScript.on("spawn", () => {
          const splittingStatement = "Splitting audio file.";

          if (process.env.NODE_ENV === "production") {
            logger.log(splittingStatement);
          } else {
            console.log(splittingStatement);
          }
        });

        spleeterScript.on("error", (err) => {
          clearTimeout(killSpleeter);

          const errorStatement = "Error received when splitting audio file!";

          if (process.env.NODE_ENV === "production") {
            logger.error(errorStatement, {
              indexMeta: true,
              meta: {
                err,
              },
            });
          } else {
            console.error(errorStatement);
          }
        });

        spleeterScript.on("exit", (code) => {
          clearTimeout(killSpleeter);

          if (code !== 0) {
            if (process.env.NODE_ENV === "production") {
              logger.error(
                "Received error when attempting to split MP3 audio with Spleeter bash command!",
                {
                  indexMeta: true,
                  meta: {
                    code: code,
                  },
                }
              );
            } else {
              console.error(
                `Received error code ${code} when attempting to split MP3 audio with Spleeter bash command!`
              );
            }
          } else {
            const successStatement = "Successfully split track into two stems";

            if (process.env.NODE_ENV === "production") {
              logger.log(successStatement);
            } else {
              console.log(successStatement);
            }

            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }

            try {
              return getBeatPositions(
                essentia,
                beatSuccessCallback,
                matchID,
                matchDuration,
                matchExpected,
                matchArr,
                trackDataJSON
              );
            } catch (err) {
              if (process.env.NODE_ENV === "production") {
                logger.error(
                  "Error getting beat positions within 'splitAudioIntoStems.js' function!",
                  {
                    indexMeta: true,
                    meta: {
                      message: err.message,
                    },
                  }
                );
              } else {
                console.error(err);
              }
              return;
            }
          }
        });
      }
    }
  );
};

module.exports = { splitAudioIntoStems };
