const getTrackTimes = require("../timestamps/getTrackTimes");
const getEachArtist = require("./getEachArtist");
const getVideoSubtitles = require("./getVideoSubtitles");

const getSubtitleJSON = async (
  videoID,
  videoTitle,
  videoDuration,
  title,
  artist
) => {
  return await getVideoSubtitles(videoID).then(async (sortedLyricsArr) => {
    const { artist1, artist2, artist3 } = getEachArtist(artist);

    const times = await getTrackTimes(
      sortedLyricsArr,
      videoTitle,
      videoDuration,
      title,
      artist1,
      artist2,
      artist3
    );

    return times;
  });
};

module.exports = getSubtitleJSON;
