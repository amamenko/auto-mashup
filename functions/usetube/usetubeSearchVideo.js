// Code taken from https://github.com/valerebron/usetube and https://github.com/FreddyJD/usetube-improved and changed to include only subtitled videos

const formatVideo = require("./helpers/formatVideo");
const axios = require("axios");

const headers = {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "x-youtube-client-name": 1,
    "x-youtube-client-version": "2.20200911.04.00",
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Mobile Safari/537.36",
  },
};

const headersAJAX = {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "User-Agent": "hellobiczes",
    "x-youtube-client-name": 1,
    "x-youtube-client-version": "2.20200731.02.01",
  },
};

const mobileRegex = /var\ ytInitialData\ \=\ \'(.*)\'\;<\/script>/;

const searchVideo = async (terms, api_key, token) => {
  try {
    let items = [];
    let videos = [];
    let didyoumean = "";
    // initial videos search
    if (!token) {
      let body = await axios.get(
        "http://api.scraperapi.com?api_key=" +
          api_key +
          "&url=https://www.youtube.com/results?search_query=" +
          encodeURIComponent(terms) +
          // Added this portion to include only videos with subtitles/closed captions
          "&sp=EgIoAQ%253D%253D&videoEmbeddable=true&keep_headers=true",
        headers
      );

      body = body.data;

      let raw = mobileRegex.exec(body)?.[1] || "{}";

      let datas = JSON.parse(decodeHex(raw)).contents.sectionListRenderer;
      items = datas.contents[0].itemSectionRenderer.contents;
      token =
        datas.continuations?.[0]?.reloadContinuationData?.continuation || "";
    }
    // more videos
    else {
      let data = await axios.get(
        "http://api.scraperapi.com?api_key=" +
          api_key +
          "&url=https://youtube.com/browse_ajax?ctoken=" +
          token +
          "&keep_headers=true",
        headersAJAX
      );
      data = data.data;

      items =
        data[1].response.continuationContents?.gridContinuation?.items || "";
      token =
        data[1].response.continuationContents?.gridContinuation
          ?.continuations?.[0]?.nextContinuationData?.continuation || "";
    }
    for (let i = 0; i < items.length; i++) {
      let formated = await formatVideo(items[i], api_key, true);
      if (formated.id === "didyoumean") {
        didyoumean = formated.title;
      } else {
        videos.push(formated);
      }
    }
    return {
      tracks: videos,
      didyoumean: didyoumean,
      token: token,
    };
  } catch (e) {
    console.log("search videos error, terms: " + terms);
    console.error(e);
  }
};

module.exports = searchVideo;
