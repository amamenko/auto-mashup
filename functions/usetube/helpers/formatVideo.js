// Code taken from https://github.com/valerebron/usetube and changed to include only subtitled videos

const getVideoDate = require("../usetubeGetVideoDate");
const getDateFromText = require("./getDateFromText");
const findVal = require("./findVal");
const { logger } = require("../../../logger/logger");
require("dotenv").config();

const formatVideo = async (video, speedDate, description) => {
  try {
    if (
      video.videoWithContextRenderer ||
      video.compactVideoRenderer ||
      video.gridVideoRenderer ||
      video.videoRenderer ||
      video.playlistVideoRenderer
    ) {
      if (video.videoWithContextRenderer) {
        video = video.videoWithContextRenderer;
      } else if (video.compactVideoRenderer) {
        video = video.compactVideoRenderer;
      } else if (video.gridVideoRenderer) {
        video = video.gridVideoRenderer;
      } else if (video.playlistVideoRenderer) {
        video = video.playlistVideoRenderer;
      } else if (video.videoRenderer) {
        video = video.videoRenderer;
      }
      let id = video.videoId;
      let durationDatas = 0;
      // get title
      if (video?.title?.simpleText) {
        video.title = video?.title?.simpleText;
      } else if (video?.title?.runs[0].text) {
        video.title = video?.title?.runs[0].text;
      } else if (video?.headline?.runs[0].text) {
        video.title = video?.headline?.runs[0].text;
      } else {
        video.title = "";
      }
      // title formating
      video.original_title = video.title;

      if (video?.title?.split("-").length === 1) {
        video.artist = "";
      } else {
        let splited = video?.original_title?.match(/([^,]*)-(.*)/);
        video.artist = splited ? splited[1] : "";
        video.title = splited ? splited[2] : "";
      }
      // duration formating
      if (video.lengthText) {
        if (durationDatas === undefined) {
          findVal(video.lengthText, "simpleText");
        } else {
          durationDatas = findVal(video.lengthText, "text");
        }
        if (durationDatas) {
          durationDatas = durationDatas.split(":");
        }
      } else if (video.thumbnailOverlays) {
        durationDatas = findVal(video, "lengthText");
        if (durationDatas) {
          durationDatas = durationDatas.split(":");
        }
      }

      let hour = 0;
      let minute = 0;
      let second = 0;
      if (durationDatas) {
        switch (durationDatas.length) {
          case 3:
            hour = parseInt(durationDatas[0]) * 60 * 60;
            minute = parseInt(durationDatas[1]) * 60;
            second = parseInt(durationDatas[2]);
            break;
          case 2:
            minute = parseInt(durationDatas[0]) * 60;
            second = parseInt(durationDatas[1]);
            break;
          case 1:
            second = parseInt(durationDatas[0]);
            break;
        }
      }
      // Date formating
      let publishedAt = new Date(Date.now());
      if (speedDate && video.publishedTimeText) {
        if (video.publishedTimeText.hasOwnProperty("simpleText")) {
          publishedAt = getDateFromText(video.publishedTimeText.simpleText);
        } else if (video.publishedTimeText.hasOwnProperty("runs")) {
          publishedAt = getDateFromText(video.publishedTimeText.runs[0].text);
        }
      } else {
        publishedAt = await getVideoDate(id);
      }

      let channel_name = "";

      if (video.accessibility) {
        if (video.accessibility.accessibilityData) {
          if (video.accessibility.accessibilityData.label) {
            const fullLabel = video.accessibility.accessibilityData.label;
            channel_name = fullLabel
              ? fullLabel.split("Go to channel - ")[1].split(" - ")[0]
              : "";
          }
        }
      }

      let channel_id = "";

      if (
        video?.channelThumbnail?.channelThumbnailWithLinkRenderer
          ?.navigationEndpoint?.browseEndpoint?.browseId
      ) {
        channel_id =
          video.channelThumbnail.channelThumbnailWithLinkRenderer
            .navigationEndpoint.browseEndpoint.browseId;
      }

      let views = 0;

      if (video.shortViewCountText) {
        if (video.shortViewCountText.runs) {
          if (video.shortViewCountText.runs[0]) {
            if (video.shortViewCountText.runs[0].text) {
              const viewNumStr =
                video.shortViewCountText.runs[0].text.split(" ")[0];
              const numArr = viewNumStr.match(/[a-z]+|[^a-z]+/gi);
              let finalNum = Number(numArr[0]);
              if (numArr[1] === "K") {
                finalNum *= 1000;
              } else {
                if (numArr[1] === "M") {
                  finalNum *= 1000000;
                }
              }
              views = finalNum;
            }
          }
        }
      }

      let relativePublishedTime = "";

      if (video.publishedTimeText) {
        if (video.publishedTimeText.runs) {
          if (video.publishedTimeText.runs[0]) {
            if (video.publishedTimeText.runs[0].text) {
              relativePublishedTime = video.publishedTimeText.runs[0].text;
            }
          }
        }
      }
      return {
        id,
        original_title: video.original_title.trim(),
        title: video.title.trim(),
        artist: video.artist.trim(),
        description: description ? description : "",
        duration: hour + minute + second,
        views,
        channel_name,
        channel_id,
        relativePublishedTime,
        publishedAt: publishedAt,
      };
    } else if (video.didYouMeanRenderer || video.showingResultsForRenderer) {
      video = video.didYouMeanRenderer
        ? video.didYouMeanRenderer
        : video.showingResultsForRenderer;
      return {
        id: "didyoumean",
        original_title: "",
        title: video.correctedQuery?.runs[0].text || "",
        artist: "",
        description: "",
        duration: 0,
        views: 0,
        channel_name: "",
        channel_id: "",
        relativePublishedTime: "",
        publishedAt: new Date(Date.now()),
      };
    }
  } catch (e) {
    const formatFailureStatement = `Format video failed: ${e}`;
    if (process.env.NODE_ENV === "production") {
      logger("server").error(formatFailureStatement);
    } else {
      console.log(formatFailureStatement);
    }
  }
};

module.exports = formatVideo;
