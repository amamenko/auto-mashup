const S3 = require("aws-sdk/clients/s3");
const fs = require("fs");
const stream = require("stream");
const { retryAsync, isTooManyTries } = require("ts-retry");
const { createReadStream } = require("fs");
const { promisify } = require("util");
const { logger } = require("../../logger/logger");
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
          logger("server").info(successStatement);
        } else {
          console.log(successStatement);
        }
        try {
          return await retryAsync(
            async () => {
              const listData = await s3
                .listObjects({
                  Bucket: process.env.AWS_S3_OUTPUT_BUCKET_NAME,
                })
                .promise();
              if (listData.Contents) {
                await Promise.allSettled(
                  listData.Contents.map(async (item) => {
                    if (item.Key.includes(`${fileName}_${matchID}`)) {
                      const foundObjectData = await s3
                        .getObject({
                          Key: item.Key,
                          Bucket: process.env.AWS_S3_OUTPUT_BUCKET_NAME,
                        })
                        .promise();
                      const buffer = Buffer.from(
                        foundObjectData.Body,
                        "base64"
                      );
                      if (
                        !fs.existsSync("output") ||
                        !fs.existsSync(`output/${fileName}`)
                      ) {
                        fs.mkdirSync(`output/${fileName}`, {
                          recursive: true,
                        });
                      }
                      return await writeFileAsync(
                        `output/${fileName}/${
                          item.Key.includes("vocals")
                            ? "vocals"
                            : "accompaniment"
                        }.mp3`,
                        buffer
                      );
                    } else {
                      return;
                    }
                  })
                );
              }
              if (
                fs.existsSync("output") &&
                fs.existsSync(`output/${fileName}`) &&
                fs.readdirSync(`output/${fileName}`).length === 2
              ) {
                return 2;
              }
              return;
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
              logger("server").error(noResponseError);
            } else {
              console.error(noResponseError);
            }
          } else {
            if (process.env.NODE_ENV === "production") {
              logger("server").error(err);
            } else {
              console.error(err);
            }
          }
        }
      }
    })
    .catch((err) => {
      if (process.env.NODE_ENV === "production") {
        logger("server").error(err);
      } else {
        console.error(err);
      }
    });
};

module.exports = { awsLambdaSplit };
