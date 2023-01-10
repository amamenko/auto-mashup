const fs = require("fs");
const path = require("path");
const checkFileExists = require("../utils/checkFileExists");
const { logger } = require("../../logger/logger");
const getBeatPositions = require("./getBeatPositions");
const { beatSuccessCallback } = require("./beatSuccessCallback");
const esPkg = require("essentia.js");
const { awsLambdaSplit } = require("../utils/awsLambdaSplit");
const { emptyBucket } = require("../utils/awsEmptyS3Bucket");
require("dotenv").config();
let essentia;

if (esPkg.EssentiaWASM) {
  essentia = new esPkg.Essentia(esPkg.EssentiaWASM);
}

const splitAudioIntoStems = async (
  matchID,
  matchDuration,
  matchExpected,
  matchArr,
  trackDataJSON
) => {
  const fileName = "YouTubeAudio";

  const checkIfInputExists = await checkFileExists(`${fileName}.mp3`);

  if (checkIfInputExists) {
    const startingSplitAttemptStatement =
      "Now attempting to split audio into vocal and accompaniment sections...";

    if (process.env.NODE_ENV === "production") {
      logger("server").info(startingSplitAttemptStatement);
    } else {
      console.log(startingSplitAttemptStatement);
    }

    await awsLambdaSplit(fileName, matchID);

    if (fs.existsSync(`${fileName}.mp3`)) fs.unlinkSync(`${fileName}.mp3`);

    const checkIfVocalsSplitSuccessfully = await checkFileExists(
      path.resolve(`output/${fileName}/vocals.mp3`)
    );

    const checkIfAccompanimentSplitSuccessfully = await checkFileExists(
      path.resolve(`output/${fileName}/accompaniment.mp3`)
    );

    if (
      checkIfVocalsSplitSuccessfully &&
      checkIfAccompanimentSplitSuccessfully
    ) {
      const successStatement = "Successfully split track into two stems!";

      if (process.env.NODE_ENV === "production") {
        logger("server").info(successStatement);
      } else {
        console.log(successStatement);
      }

      await emptyBucket(process.env.AWS_S3_INPUT_BUCKET_NAME);
      await emptyBucket(process.env.AWS_S3_OUTPUT_BUCKET_NAME);

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
          logger("server").error(
            `Error getting beat positions within 'splitAudioIntoStems.js' function: ${err.message}`
          );
        } else {
          console.error(err);
        }
        return;
      }
    } else {
      const unsuccessfulSplitStatement =
        "Either vocals or accompaniment did not get split successfully. Cannot get beat positions. Moving on to next song!";

      if (process.env.NODE_ENV === "production") {
        logger("server").info(unsuccessfulSplitStatement);
      } else {
        console.log(unsuccessfulSplitStatement);
      }

      const outputDirectoryExists = await checkFileExists(
        path.resolve("output")
      );

      if (outputDirectoryExists) {
        fs.rmSync(path.resolve("output"), {
          recursive: true,
          force: true,
        });
      }

      return;
    }
  } else {
    const noExistStatement = `${fileName}.mp3 input audio file does not exist! Moving on to next song.`;

    if (process.env.NODE_ENV === "production") {
      logger("server").info(noExistStatement);
    } else {
      console.log(noExistStatement);
    }

    return;
  }
};

module.exports = { splitAudioIntoStems };
