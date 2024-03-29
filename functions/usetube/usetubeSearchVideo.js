// Code taken from https://github.com/valerebron/usetube and changed to include only subtitled videos

const getData = require("./helpers/getData");
const formatVideo = require("./helpers/formatVideo");
const findVal = require("./helpers/findVal");
const { logger } = require("../../logger/logger");
require("dotenv").config();

const searchVideo = async (terms, token, apikey, captionsOnly) => {
  try {
    let items = [];
    let videos = [];
    let didyoumean = "";
    // initial videos search
    if (!token) {
      let data = await getData(
        "https://www.youtube.com/results?videoEmbeddable=true&search_query=" +
          encodeURIComponent(terms) +
          // Added this portion to include only videos with subtitles/closed captions
          (captionsOnly ? "&sp=EgIoAQ%253D%253D" : "")
      );
      apikey = data.apikey;
      token = findVal(data, "token");
      items = findVal(data, "itemSectionRenderer").contents;
    }
    // more videos
    else {
      let data = await getData(
        "https://www.youtube.com/youtubei/v1/search?key=" +
          apikey +
          "&token=" +
          token
      );
      items = findVal(data.items, "contents");
      token = data.token;
    }

    for (let i = 0; i < items.length; i++) {
      let formated = await formatVideo(items[i], true);
      if (formated) {
        if (formated.id === "didyoumean") {
          didyoumean = formated.title;
        } else {
          videos.push(formated);
        }
      }
    }
    return {
      videos: videos,
      didyoumean: didyoumean,
      token: token,
      apikey: apikey,
    };
  } catch (e) {
    const errorStatement = "search videos error, terms: " + terms;

    if (process.env.NODE_ENV === "production") {
      logger("server").info(errorStatement);
    } else {
      console.log(errorStatement);
    }
  }
};

module.exports = searchVideo;
