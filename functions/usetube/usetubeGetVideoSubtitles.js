// Code taken from https://github.com/valerebron/usetube and changed to include only subtitled videos

const getData = require("./helpers/getData");

const getVideoSubtitles = async (id) => {
  try {
    const data = await getData(
      "https://m.youtube.com/watch?v=" + id + "&type=subtitles"
    );
    return data.data.events;
  } catch (e) {
    console.log("video subtitle error for " + id);
  }
};

module.exports = getVideoSubtitles;
