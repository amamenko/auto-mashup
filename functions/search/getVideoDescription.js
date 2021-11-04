const axios = require("axios");
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
      console.log("No useful description data found!");
    })
    .catch((e) => console.error(e));
};

module.exports = getVideoDescription;
