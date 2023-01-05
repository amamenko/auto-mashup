const S3 = require("aws-sdk/clients/s3");
const fs = require("fs");
const stream = require("stream");
const { retry, isTooManyTries } = require("ts-retry");
const { createReadStream } = require("fs");
const { promisify } = require("util");
const { logger } = require("../logger/initializeLogger");
require("dotenv").config();

const writeFileAsync = promisify(fs.writeFile);

const region = process.env.AWS_S3_BUCKET_REGION;
const accessKeyId = process.env.AWS_S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_S3_SECRET_ACCESS_KEY;

const s3 = new S3({
  region,
  accessKeyId,
  secretAccessKey,
});

const awsLambdaSplit = async (fileName, matchID) => {
  const audioFileName = `${fileName}.mp3`;
  const keyName = `${fileName}_${matchID}.mp3`;
  const finished = promisify(stream.finished);
  const readStream = createReadStream(audioFileName, {
    highWaterMark: 16,
  });
  const data = [];
  readStream.on("data", (chunk) => data.push(chunk));
  readStream.on("error", (err) => console.error(err));
  const run = async () => await finished(readStream);
  return await run()
    .then(async () => {
      const uploadData = await s3
        .upload({
          Bucket: process.env.AWS_S3_INPUT_BUCKET_NAME,
          Key: keyName,
          Body: Buffer.concat(data),
          ContentType: "audio/mpeg",
        })
        .promise();
      if (uploadData) {
        const successStatement = `Successfully uploaded audio: ${JSON.stringify(
          uploadData
        )}`;
        if (process.env.NODE_ENV === "production") {
          logger.log(successStatement);
        } else {
          console.log(successStatement);
        }
        try {
          return await retry(
            async () => {
              const foundOutputFiles = [];
              const listData = await s3
                .listObjects({
                  Bucket: process.env.AWS_S3_OUTPUT_BUCKET_NAME,
                  MaxKeys: 5,
                })
                .promise();
              if (listData.Contents) {
                for (const item of listData.Contents) {
                  if (item.Key.includes(fileName)) {
                    const foundObjectData = await s3
                      .getObject({
                        Key: item.Key,
                        Bucket: process.env.AWS_S3_OUTPUT_BUCKET_NAME,
                      })
                      .promise();
                    const buffer = Buffer.from(foundObjectData.Body, "base64");
                    if (
                      !fs.existsSync("output") ||
                      !fs.existsSync(`output/${fileName}`)
                    )
                      fs.mkdirSync(`output/${fileName}`, {
                        recursive: true,
                      });
                    await writeFileAsync(
                      `output/${fileName}/${
                        item.Key.includes("vocals") ? "vocals" : "accompaniment"
                      }.mp3`,
                      buffer
                    );
                    foundOutputFiles.push(item.Key);
                  }
                }
              }
              if (
                foundOutputFiles.find((el) => el.includes("accompaniment")) &&
                foundOutputFiles.find((el) => el.includes("vocals"))
              ) {
                const successStatement =
                  "Successfully split track into two stems!";
                if (process.env.NODE_ENV === "production") {
                  logger.error(successStatement);
                } else {
                  console.error(successStatement);
                }
                return foundOutputFiles.length;
              }
            },
            {
              delay: 5000,
              maxTry: 14,
              until: (lastResult) => lastResult === 2,
            }
          );
        } catch (err) {
          if (isTooManyTries(err)) {
            const noResponseError =
              "Did not receive accompaniment and vocal stems after over a minute of waiting!";
            if (process.env.NODE_ENV === "production") {
              logger.error(noResponseError);
            } else {
              console.error(noResponseError);
            }
          } else {
            if (process.env.NODE_ENV === "production") {
              logger.error(err);
            } else {
              console.error(err);
            }
          }
        }
      }
    })
    .catch((err) => {
      if (process.env.NODE_ENV === "production") {
        logger.error(err);
      } else {
        console.error(err);
      }
    });
};

module.exports = { awsLambdaSplit };
