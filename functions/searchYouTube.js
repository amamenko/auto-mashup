const getSubtitleJSON = require("./getSubtitleJSON");
const searchVideo = require("./usetube/usetubeSearchVideo");

const searchYouTube = async (trackTitle, trackArtist) => {
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

  const filterRegex = /(live)|(instrumental)|(karaoke)|(parody)|(\(cover\))/gi;

  const filteredVids = videos.filter(
    (video) => !filterRegex.test(video.original_title)
  );

  const firstThree = filteredVids.slice(0, 3);

  const allResultsArr = [];

  for (let i = 0; i < firstThree.length; i++) {
    setTimeout(async () => {
      console.log(
        `Getting subtitles for video ${i + 1} of ${firstThree.length}`
      );
      await getSubtitleJSON(firstThree[i].id, trackTitle, trackArtist)
        .then((arr) => {
          if (arr) {
            allResultsArr.push({
              id: firstThree[i].id,
              arr,
              arrLength: arr.length,
            });
          }
        })
        .catch((err) => {
          return;
        });
    }, i * 15000);
  }

  const allResultLengths = allResultsArr.map((item) => item.arrLength);

  const bestMatch = allResultsArr.find(
    (item) => item.length === Math.max(allResultLengths)
  );

  console.log(bestMatch);
};

module.exports = searchYouTube;
