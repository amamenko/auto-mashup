const sendDataToContentful = require("../contentful/sendDataToContentful");
const { logger } = require("../../logger/logger");
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

            sendDataToContentful(
              trackDataJSON,
              matchDuration,
              matchArr,
              roundedBeatPositions,
              matchExpected,
              videoID
            );
          } else {
            const noBeatPositionsStatement =
              "No beat positions returned from analysis!";

            if (process.env.NODE_ENV === "production") {
              logger("server").info(noBeatPositionsStatement);
            } else {
              console.log(noBeatPositionsStatement);
            }
            return;
          }
        } else {
          const noBeatTicksStatement = "No beat ticks returned from analysis!";

          if (process.env.NODE_ENV === "production") {
            logger("server").info(noBeatTicksStatement);
          } else {
            console.log(noBeatTicksStatement);
          }
          return;
        }
      } else {
        const noBeatsStatement = "No beats returned from analysis!";

        if (process.env.NODE_ENV === "production") {
          logger("server").info(noBeatsStatement);
        } else {
          console.log(noBeatsStatement);
        }
        return;
      }
    } else {
      const noUsefulBufferStatement =
        "No useful buffer provided to the Essentia beat matching function. Moving on to next track!";

      if (process.env.NODE_ENV === "production") {
        logger("server").info(noUsefulBufferStatement);
      } else {
        console.log(noUsefulBufferStatement);
      }

      return;
    }
  } else {
    const errorEssentiaStatement =
      "Error with Essentia module. Cannot run beat matching function. Moving on to next track!";

    if (process.env.NODE_ENV === "production") {
      logger("server").info(errorEssentiaStatement);
    } else {
      console.log(errorEssentiaStatement);
    }
    return;
  }
};

module.exports = { beatSuccessCallback };
