const searchVideo = require("../usetube/usetubeSearchVideo");
const filterVideoResults = require("./filterVideoResults");

const searchYouTube = async (trackTitle, trackArtist) => {
  const searchForVideoFunction = async (searchTerm, captionOnly) => {
    return await searchVideo(searchTerm, undefined, undefined, captionOnly)
      .then(async (results) => {
        if (results) {
          if (results.videos) {
            if (results.videos.length > 0) {
              const allResultsArr = results.videos;

              return allResultsArr;
            } else {
              console.log("No results found!");
              return;
            }
          }
        }
      })
      .catch((e) => console.error(e));
  };

  const videosWithLyrics = await searchForVideoFunction(
    `${trackTitle} ${trackArtist} lyrics`,
    true
  ).catch((e) => console.error(e));

  if (videosWithLyrics && videosWithLyrics.length > 0) {
    const filtered = await filterVideoResults(
      videosWithLyrics,
      trackTitle,
      trackArtist
    ).catch((e) => console.error(e));

    if (filtered) {
      return filtered;
    } else {
      console.log(
        `No applicable YouTube videos found for search term "${trackTitle} ${trackArtist} lyrics"`
      );
      return;
    }
  } else {
    console.log(
      `No applicable YouTube videos found for search term "${trackTitle} ${trackArtist} lyrics"`
    );
    return;
  }
};

module.exports = searchYouTube;
