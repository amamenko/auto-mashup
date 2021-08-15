const searchVideo = require("./usetube/usetubeSearchVideo");

const searchYouTube = async (trackTitle, trackArtist, spotifyDuration) => {
  const videos = await searchVideo(`${trackTitle} ${trackArtist} `).then(
    async (results) => {
      if (results) {
        if (results.videos) {
          if (results.videos.length > 0) {
            const allResultsArr = results.videos;

            return allResultsArr;
          } else {
            console.log("No results found!");
          }
        }
      }
    }
  );

  const filterRegex = /(live)|(instrumental)|(karaoke)|(\(cover\))/gi;

  const filteredVids = videos.filter(
    (video) => !filterRegex.test(video.original_title)
  );

  const secondsArr = filteredVids.map((vid) => vid.duration);

  const differenceArr = secondsArr.map((item) =>
    Math.abs(item - spotifyDuration)
  );

  const closestDurationIndex = differenceArr.indexOf(
    Math.min(...differenceArr)
  );

  const closestVideoMatch = filteredVids[closestDurationIndex];
  const closestVideoMatchID = closestVideoMatch.id;

  console.log(closestVideoMatch);
  return closestVideoMatchID;
};

module.exports = searchYouTube;
