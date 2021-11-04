const { searchChannel, getChannelDesc } = require("usetube");

const getChannelDescription = async (video) => {
  let description = "";

  if (video.channel_id) {
    description = await getChannelDesc(exactMatch.channel_id).catch((err) =>
      console.error(err)
    );
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
                  (err) => console.error(err)
                );
              }
            }
          }
        }

        return;
      })
      .catch((err) => console.error(err));
  } else {
    return;
  }

  return description;
};

module.exports = getChannelDescription;
