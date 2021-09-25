// Code taken from https://github.com/valerebron/usetube and https://github.com/FreddyJD/usetube-improved and changed to include only subtitled videos

const formatVideo = async (video, api_key, speedDate) => {
  try {
    if (
      video.compactVideoRenderer ||
      video.gridVideoRenderer ||
      video.playlistVideoRenderer
    ) {
      if (video.compactVideoRenderer) {
        video = video.compactVideoRenderer;
      } else if (video.gridVideoRenderer) {
        video = video.gridVideoRenderer;
      } else if (video.playlistVideoRenderer) {
        video = video.playlistVideoRenderer;
      }
      let id = video.videoId;
      let durationDatas = 0;
      // get title
      if (video.title.simpleText) {
        video.title = video.title.simpleText;
      } else if (video.title.runs[0].text) {
        video.title = video.title.runs[0].text;
      } else {
        video.title = "";
      }
      // title formating
      video.original_title = video.title;

      if (video.title.split("-").length === 1) {
        video.artist = "";
      } else {
        let splited = video.original_title.match(/([^,]*)-(.*)/);
        video.artist = splited[1];
        video.title = splited[2];
      }
      // duration formating
      if (video.lengthText) {
        durationDatas = video.lengthText.runs[0].text.split(":");
      } else if (
        video.thumbnailOverlays[0]?.thumbnailOverlayTimeStatusRenderer?.text
          .simpleText
      ) {
        durationDatas =
          video.thumbnailOverlays[0]?.thumbnailOverlayTimeStatusRenderer?.text.simpleText.split(
            ":"
          ) || "";
      } else {
        durationDatas = [0, 0];
      }
      let minutes = parseInt(durationDatas[0]) * 60;
      let seconds = parseInt(durationDatas[1]);
      // Date formating
      return {
        id: id,
        original_title: video.original_title.trim(),
        title: video.title.trim(),
        artist: video.artist.trim(),
        duration: minutes + seconds,
      };
    } else if (video.didYouMeanRenderer || video.showingResultsForRenderer) {
      video = video.didYouMeanRenderer
        ? video.didYouMeanRenderer
        : video.showingResultsForRenderer;
      return {
        id: "didyoumean",
        title: video.correctedQuery.runs[0].text,
        artist: "",
        duration: 0,
      };
    }
  } catch (e) {
    console.error("format video failed");
    console.error(e);
  }
};

module.exports = formatVideo;
