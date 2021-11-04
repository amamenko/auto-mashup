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

  const backUpSearchVideos = async () => {
    console.log(
      `No applicable YouTube videos found for search term "${trackTitle} ${trackArtist} lyrics". Trying again without the "lyrics" phrase.`
    );

    // No useful closed-captioned videos, see if there are any useful auto-generated captions available
    const regularVideos = await searchForVideoFunction(
      `${trackTitle} ${trackArtist}`,
      false
    ).catch((e) => console.error(e));

    if (regularVideos && regularVideos.length > 0) {
      return await filterVideoResults(
        regularVideos,
        trackTitle,
        trackArtist
      ).catch((e) => console.error(e));
    } else {
      console.log(
        `No applicable YouTube videos found for search term "${trackTitle} ${trackArtist}" either.`
      );
      return;
    }
  };

  if (videosWithLyrics && videosWithLyrics.length > 0) {
    const filtered = await filterVideoResults(
      videosWithLyrics,
      trackTitle,
      trackArtist
    ).catch((e) => console.error(e));

    if (filtered) {
      return filtered;
    } else {
      return await backUpSearchVideos().catch((e) => console.error(e));
    }
  } else {
    return await backUpSearchVideos().catch((e) => console.error(e));
  }
};

module.exports = searchYouTube;
