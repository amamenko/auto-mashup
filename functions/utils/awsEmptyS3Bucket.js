const {
  S3Client,
  ListObjectsCommand,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");
const { logger } = require("../../logger/logger");
const axios = require("axios");
const { xmlToString } = require("./awsLambdaSplit");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
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

const listBucketObjects = async (bucketName) => {
  const listBucketObjectsCommand = new ListObjectsCommand({
    Bucket: bucketName,
  });
  const listUrl = await getSignedUrl(s3Client, listBucketObjectsCommand, {
    expiresIn: 3600,
  });
  const listResponse = await axios.get(listUrl);
  const xmlData = listResponse.data;
  return await xmlToString(xmlData);
};

const deleteBucketObjects = async (bucketName, contents) => {
  try {
    const deleteBucketObjectsCommand = new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: contents.map(({ Key }) => ({ Key })),
      },
    });
    await s3Client.send(deleteBucketObjectsCommand);
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      logger("server").error(err);
    } else {
      console.error(err);
    }
  }
};

const emptyBucket = async (bucketName) => {
  try {
    const listBucketObjectsResponse = await listBucketObjects(bucketName);
    const contents = listBucketObjectsResponse?.ListBucketResult?.Contents;
    if (contents && contents.length > 0)
      await deleteBucketObjects(bucketName, contents);
    const emptiedBucketStatement = `Successfully emptied ${bucketName} S3 bucket!`;
    if (process.env.NODE_ENV === "production") {
      logger("server").info(emptiedBucketStatement);
    } else {
      console.log(emptiedBucketStatement);
    }
    return true;
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      logger("server").error(err);
    } else {
      console.error(err);
    }
    return false;
  }
};

module.exports = { emptyBucket };
