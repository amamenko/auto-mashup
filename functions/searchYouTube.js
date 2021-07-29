const yts = require("yt-search");

const searchYouTube = async (trackTitle, trackArtist, spotifyDuration) => {
  const r = await yts(`${trackArtist} ${trackTitle} audio`);

  const filterRegex = /(live)|(video)|(instrumental)|(karaoke)|(MV)/gi;
  const shouldIncludeRegex = /(audio)|(lyrics)|(HQ)|(HD)|(mp3)|(wav)|(sound)/gi;

  const videos = r.videos.slice(0, 35);
  const filteredVids = videos.filter(
    (video) =>
      shouldIncludeRegex.test(video.title) && !filterRegex.test(video.title)
  );

  const secondsArr = [];

  for (let i = 0; i < filteredVids.length; i++) {
    const currentVideo = filteredVids[i];

    const time = currentVideo.timestamp.split(":");
    let timeInSeconds = 0;

    if (time.length === 3) {
      timeInSeconds =
        Number(time[0]) * 3600 + Number(time[1]) * 60 + Number(time[2]);
    } else {
      timeInSeconds = Number(time[0]) * 60 + Number(time[1]);
    }

    secondsArr.push(timeInSeconds);
  }

  const differenceArr = secondsArr.map((item) =>
    Math.abs(item - spotifyDuration)
  );

  const closestDurationIndex = differenceArr.indexOf(
    Math.min(...differenceArr)
  );

  const closestVideoMatch = filteredVids[closestDurationIndex];
  const closestVideoMatchID = closestVideoMatch.videoId;

  return closestVideoMatchID;
};

module.exports = searchYouTube;
