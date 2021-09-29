const searchVideo = require("../usetube/usetubeSearchVideo");
const filterVideoResults = require("./filterVideoResults");

const searchYouTube = async (trackTitle, trackArtist) => {
  const searchForVideoFunction = async (searchTerm, captionOnly) => {
    return await searchVideo(
      searchTerm,
      undefined,
      undefined,
      captionOnly
    ).then(async (results) => {
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
    });
  };

  const videosWithLyrics = await searchForVideoFunction(
    `${trackTitle} ${trackArtist} lyrics`,
    true
  );

  const backUpSearchVideos = async () => {
    console.log(
      `No applicable YouTube videos found for search term "${trackTitle} ${trackArtist} lyrics". Trying again without the "lyrics" phrase.`
    );

    // No useful closed-captioned videos, see if there are any useful auto-generated captions available
    const regularVideos = await searchForVideoFunction(
      `${trackTitle} ${trackArtist}`,
      false
    );

    if (regularVideos && regularVideos.length > 0) {
      return await filterVideoResults(regularVideos, trackTitle, trackArtist);
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
    );

    if (filtered) {
      return filtered;
    } else {
      return await backUpSearchVideos();
    }
  } else {
    return await backUpSearchVideos();
  }
};

module.exports = searchYouTube;
