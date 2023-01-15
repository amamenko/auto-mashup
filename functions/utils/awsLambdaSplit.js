const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const fs = require("fs");
const stream = require("stream");
const { retryAsync, isTooManyTries } = require("ts-retry");
const { createReadStream } = require("fs");
const { promisify } = require("util");
const { logger } = require("../../logger/logger");
const xml2js = require("xml2js");
const axios = require("axios");
require("dotenv").config();

const region = process.env.AWS_S3_BUCKET_REGION;
const accessKeyId = process.env.AWS_S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_S3_SECRET_ACCESS_KEY;

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const xmlToString = async (xmlData) => {
  return await xml2js
    .parseStringPromise(xmlData)
    .then((res) => res)
    .catch((err) => console.error(err));
};

const uploadAudioToBucket = async (keyName, data) => {
  const uploadBucketParams = {
    Bucket: process.env.AWS_S3_INPUT_BUCKET_NAME,
    Key: keyName,
    Body: Buffer.concat(data),
    ContentType: "audio/mpeg",
  };
  const uploadCommand = new PutObjectCommand(uploadBucketParams);
  const uploadSignedUrl = await getSignedUrl(s3Client, uploadCommand, {
    expiresIn: 3600,
  });
  const uploadResponse = await axios.put(
    uploadSignedUrl,
    uploadBucketParams.Body
  );
  if (uploadResponse.status === 200 || uploadResponse.statusText === "OK")
    return true;
  return;
};

const listBucketObjects = async (listUrl) => {
  const listResponse = await axios.get(listUrl);
  const xmlData = listResponse.data;
  return await xmlToString(xmlData);
};

const getBucketObject = async (fileName, keyName) => {
  try {
    const getBucketObjectParams = {
      Key: keyName,
      Bucket: process.env.AWS_S3_OUTPUT_BUCKET_NAME,
    };
    const getBucketObjectCommand = new GetObjectCommand(getBucketObjectParams);
    const getObjectUrl = await getSignedUrl(s3Client, getBucketObjectCommand, {
      expiresIn: 3600,
    });
    if (!fs.existsSync("output") || !fs.existsSync(`output/${fileName}`)) {
      fs.mkdirSync(`output/${fileName}`, {
        recursive: true,
      });
    }
    await axios.get(getObjectUrl, { responseType: "stream" }).then((res) => {
      const destination = fs.createWriteStream(
        `output/${fileName}/${
          keyName.includes("vocals") ? "vocals" : "accompaniment"
        }.mp3`
      );
      res.data.pipe(destination);
    });
    return true;
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      logger("server").error(err);
    } else {
      console.error(err);
    }
    return;
  }
};

const awsLambdaSplit = async (fileName, matchID) => {
  const audioFileName = `${fileName}.mp3`;
  const keyName = `${fileName}_${matchID}.mp3`;
  const finished = promisify(stream.finished);
  const readStream = createReadStream(audioFileName, {
    highWaterMark: 16,
  });
  const data = [];
  readStream.on("data", (chunk) => data.push(chunk));
  readStream.on("error", (err) => {
    if (process.env.NODE_ENV === "production") {
      logger("server").error(err);
    } else {
      console.error(err);
    }
  });
  const run = async () => await finished(readStream);
  return await run()
    .then(async () => {
      const uploadResponse = await uploadAudioToBucket(keyName, data);
      if (uploadResponse) {
        const successStatement = `Successfully uploaded audio: ${JSON.stringify(
          uploadResponse.data
        )}`;
        if (process.env.NODE_ENV === "production") {
          logger("server").info(successStatement);
        } else {
          console.log(successStatement);
        }
        try {
          const listBucketObjectsParams = {
            Bucket: process.env.AWS_S3_OUTPUT_BUCKET_NAME,
          };
          const listBucketObjectsCommand = new ListObjectsCommand(
            listBucketObjectsParams
          );
          const listUrl = await getSignedUrl(
            s3Client,
            listBucketObjectsCommand,
            {
              expiresIn: 3600,
            }
          );
          return await retryAsync(
            async () => {
              const listBucketObjectsResponse = await listBucketObjects(
                listUrl
              );
              if (listBucketObjectsResponse?.ListBucketResult?.Contents) {
                await Promise.allSettled(
                  listBucketObjectsResponse.ListBucketResult.Contents.map(
                    async (item) => {
                      if (
                        item.Key &&
                        Array.isArray(item.Key) &&
                        item.Key[0].includes(`${fileName}_${matchID}`)
                      ) {
                        return await getBucketObject(fileName, item.Key[0]);
                      } else {
                        return;
                      }
                    }
                  )
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
              // Wait at most 2 minutes
              maxTry: 24,
              until: (lastResult) => lastResult === 2,
            }
          );
        } catch (err) {
          if (isTooManyTries(err)) {
            const noResponseError =
              "Did not receive accompaniment and vocal stems after 2 minutes of waiting!";
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

module.exports = { awsLambdaSplit, xmlToString };
