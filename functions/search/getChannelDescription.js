const { searchChannel, getChannelDesc } = require("usetube");
const { logger } = require("../../logger/logger");
require("dotenv").config();

const getChannelDescription = async (video) => {
  let description = "";

  if (video.channel_id) {
    description = await getChannelDesc(exactMatch.channel_id).catch((err) => {
      if (process.env.NODE_ENV === "production") {
        logger("server").error(
          `Something went wrong when getting channel description for channel ID ${exactMatch.channel_id}: ${err.message}`
        );
      } else {
        console.error(err);
      }
    });
  } else if (video.channel_name) {
    description = await searchChannel(video.channel_name)
      .then(async (channel_res) => {
        if (channel_res) {
          if (channel_res.channels && channel_res.channels.length > 0) {
            const exactMatch = channel_res.channels.find(
              (item) => item.name === video.channel_name
            );

            if (exactMatch) {
              if (exactMatch.channel_id) {
                return await getChannelDesc(exactMatch.channel_id).catch(
                  (err) => {
                    if (process.env.NODE_ENV === "production") {
                      logger("server").error(
                        `Something went wrong when getting channel description for channel ID ${exactMatch.channel_id}: ${err.message}`
                      );
                    } else {
                      console.error(err);
                    }
                  }
                );
              }
            }
          }
        }

        return;
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "production") {
          logger("server").error(
            `Something went wrong when getting channel description for channel name ${video.channel_name}: ${err.message}`
          );
        } else {
          console.error(err);
        }
      });
  } else {
    return;
  }

  return description;
};

module.exports = getChannelDescription;
