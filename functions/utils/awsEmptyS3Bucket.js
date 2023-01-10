const S3 = require("aws-sdk/clients/s3");
require("dotenv").config();

const region = process.env.AWS_S3_BUCKET_REGION;
const accessKeyId = process.env.AWS_S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_S3_SECRET_ACCESS_KEY;

const s3 = new S3({
  region,
  accessKeyId,
  secretAccessKey,
});

const deleteBucket = async (Bucket) => {
  try {
    const { Contents } = await s3.listObjects({ Bucket }).promise();
    if (Contents.length > 0) {
      await s3
        .deleteObjects({
          Bucket,
          Delete: {
            Objects: Contents.map(({ Key }) => ({ Key })),
          },
        })
        .promise();
    }
    const emptiedBucketStatement = `Successfully emptied ${Bucket} S3 bucket!`;
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

module.exports = { deleteBucket };
