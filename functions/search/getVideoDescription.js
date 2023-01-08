const axios = require("axios");
const { logger } = require("../../logger/logger");
require("dotenv").config();

const getVideoDescription = async (videoID) => {
  return await axios
    .get(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoID}&fields=items/snippet/title,items/snippet/description&key=${process.env.YOUTUBE_API_KEY}`
    )
    .then((res) => res.data)
    .then((data) => {
      if (data) {
        if (data.items) {
          if (data.items[0]) {
            if (data.items[0].snippet) {
              if (data.items[0].snippet.description) {
                const description = data.items[0].snippet.description;

                return description;
              }
            }
          }
        }
      }

      const noUsefulDescriptionStatement = "No useful description data found!";

      if (process.env.NODE_ENV === "production") {
        logger("server").info(noUsefulDescriptionStatement);
      } else {
        console.log(noUsefulDescriptionStatement);
      }
    })
    .catch((err) => {
      if (process.env.NODE_ENV === "production") {
        logger("server").error(
          `Received error when getting video description for video ID ${videoID}: ${err.message}`
        );
      } else {
        console.error(err);
      }
    });
};

module.exports = getVideoDescription;
