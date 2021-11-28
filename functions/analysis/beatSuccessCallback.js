const MP3Cutter = require("../mp3Cutter/cutter");
const sendDataToContentful = require("../contentful/sendDataToContentful");
const { logger } = require("../logger/initializeLogger");
require("dotenv").config();

// Get beat positions from accompaniment track
const beatSuccessCallback = async (
  essentia,
  buffer,
  videoID,
  matchDuration,
  matchExpected,
  matchArr,
  trackDataJSON
) => {
  if (essentia) {
    if (buffer) {
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

          if (beatPositions) {
            const roundedBeatPositions = [...beatPositions].map((item) =>
              Number(item.toFixed(4))
            );

            if (matchDuration > 360) {
              const accompanimentFileExists = await checkFileExists(
                "output/YouTubeAudio/accompaniment.mp3"
              );

              const vocalsFileExists = await checkFileExists(
                "output/YouTubeAudio/vocals.mp3"
              );

              if (accompanimentFileExists && vocalsFileExists) {
                MP3Cutter.cut({
                  src: "output/YouTubeAudio/accompaniment.mp3",
                  target: "output/YouTubeAudio/accompaniment_trimmed.mp3",
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
                          "trimmed",
                          matchExpected,
                          videoID
                        ),
                    }),
                });
              } else {
                const doesntExistStatement =
                  "Either vocals or accompaniment file does not exist! Moving on to next track.";

                if (process.env.NODE_ENV === "production") {
                  logger.log(doesntExistStatement);
                } else {
                  console.log(doesntExistStatement);
                }

                return;
              }
            } else {
              sendDataToContentful(
                trackDataJSON,
                matchDuration,
                matchArr,
                roundedBeatPositions,
                "",
                matchExpected,
                videoID
              );
            }
          } else {
            const noBeatPositionsStatement =
              "No beat positions returned from analysis!";

            if (process.env.NODE_ENV === "production") {
              logger.log(noBeatPositionsStatement);
            } else {
              console.log(noBeatPositionsStatement);
            }
            return;
          }
        } else {
          const noBeatTicksStatement = "No beat ticks returned from analysis!";

          if (process.env.NODE_ENV === "production") {
            logger.log(noBeatTicksStatement);
          } else {
            console.log(noBeatTicksStatement);
          }
          return;
        }
      } else {
        const noBeatsStatement = "No beats returned from analysis!";

        if (process.env.NODE_ENV === "production") {
          logger.log(noBeatsStatement);
        } else {
          console.log(noBeatsStatement);
        }
        return;
      }
    } else {
      const noUsefulBufferStatement =
        "No useful buffer provided to the Essentia beat matching function. Moving on to next track!";

      if (process.env.NODE_ENV === "production") {
        logger.log(noUsefulBufferStatement);
      } else {
        console.log(noUsefulBufferStatement);
      }

      return;
    }
  } else {
    const errorEssentiaStatement =
      "Error with Essentia module. Cannot run beat matching function. Moving on to next track!";

    if (process.env.NODE_ENV === "production") {
      logger.log(errorEssentiaStatement);
    } else {
      console.log(errorEssentiaStatement);
    }
    return;
  }
};

module.exports = { beatSuccessCallback };
