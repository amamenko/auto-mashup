const searchVideo = require("../usetube/usetubeSearchVideo");
const filterVideoResults = require("./filterVideoResults");
const { logger } = require("../../logger/logger");
require("dotenv").config();

const searchYouTube = async (trackTitle, trackArtist) => {
  const searchForVideoFunction = async (searchTerm, captionOnly) => {
    return await searchVideo(searchTerm, undefined, undefined, captionOnly)
      .then(async (results) => {
        if (results) {
          if (results.videos) {
            if (results.videos.length > 0) {
              return results.videos;
            } else {
              const noResultsStatement = "No results found!";
              if (process.env.NODE_ENV === "production") {
                logger("server").info(noResultsStatement);
              } else {
                console.log(noResultsStatement);
              }
              return;
            }
          }
        }
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "production") {
          logger("server").error(
            `Something went wrong when attempting to search for YouTube video with search term "${searchTerm}": ${err.message}`
          );
        } else {
          console.error(err);
        }
      });
  };

  const videosWithLyrics = await searchForVideoFunction(
    `${trackTitle} ${trackArtist} lyrics`,
    true
  ).catch((err) => {
    if (process.env.NODE_ENV === "production") {
      logger("server").error(
        `Something went wrong when attempting to search for YouTube video with search term "${trackTitle} ${trackArtist} lyrics": ${err.message}`
      );
    } else {
      console.error(err);
    }
  });

  const noApplicableVideosStatement = `No applicable YouTube videos found for search term "${trackTitle} ${trackArtist} lyrics"`;

  if (videosWithLyrics && videosWithLyrics.length > 0) {
    const filtered = await filterVideoResults(
      videosWithLyrics,
      trackTitle,
      trackArtist
    ).catch((err) => {
      if (process.env.NODE_ENV === "production") {
        logger("server").error(
          `Something went wrong when attempting to filter all YouTube video results: ${err.message}`
        );
      } else {
        console.error(err);
      }
    });
    if (filtered) {
      return filtered;
    } else {
      if (process.env.NODE_ENV === "production") {
        logger("server").info(noApplicableVideosStatement);
      } else {
        console.log(noApplicableVideosStatement);
      }
      return;
    }
  } else {
    if (process.env.NODE_ENV === "production") {
      logger("server").info(noApplicableVideosStatement);
    } else {
      console.log(noApplicableVideosStatement);
    }
    return;
  }
};

module.exports = searchYouTube;
