const { decode } = require("html-entities");
const { logger } = require("../logger/initializeLogger");
const getTranscripts = require("../timestamps/getTranscripts");
const installYouTubeTranscriptAPI = require("../timestamps/installYouTubeTranscriptAPI");
const secondsToTimestamp = require("../utils/secondsToTimestamp");
require("dotenv").config();

const getVideoSubtitles = async (video_id) => {
  const getYouTubeTranscript = async (id) => {
    return await installYouTubeTranscriptAPI()
      .then(async () => {
        return await getTranscripts(id).catch((err) => {
          if (process.env.NODE_ENV === "production") {
            logger.error(
              `Received error when getting transcripts for video ID ${id}.`,
              {
                indexMeta: true,
                meta: {
                  message: err.message,
                },
              }
            );
          } else {
            console.error(err);
          }
        });
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "production") {
          logger.error(
            "Received error when installing youtube_transcript_api.",
            {
              indexMeta: true,
              meta: {
                message: err.message,
              },
            }
          );
        } else {
          console.error(err);
        }
      });
  };

  const lyricsArrayAsString = await getYouTubeTranscript(video_id).catch(
    (err) => {
      if (process.env.NODE_ENV === "production") {
        logger.error(
          `Received error when getting YouTube transcript for video ID ${video_id}.`,
          {
            indexMeta: true,
            meta: {
              message: err.message,
            },
          }
        );
      } else {
        console.error(err);
      }
    }
  );

  if (lyricsArrayAsString) {
    let parsedJSON = "";

    const isValidJSON = (str) => {
      try {
        return !!(JSON.parse(str) && str);
      } catch (e) {
        return false;
      }
    };

    if (isValidJSON(lyricsArrayAsString)) {
      parsedJSON = JSON.parse(lyricsArrayAsString);
    }

    const noUsableStatement = "No usable subtitles found.";

    if (parsedJSON) {
      const lyricsArr = parsedJSON[0];

      if (lyricsArr) {
        const formattedTextArr = lyricsArr
          .map((item) => {
            return {
              start: item.start ? secondsToTimestamp(item.start) : 0,
              end:
                item.start && item.duration
                  ? secondsToTimestamp(item.start + item.duration)
                  : 0,
              lyrics: item.text
                ? decode(
                    item.text
                      .toLowerCase()
                      .replace("\n", " ")
                      .replace(/(^|\s)♪($|\s)/gi, "")
                  )
                : item.text,
            };
          })
          .filter(
            (item) =>
              item.start &&
              item.end &&
              item.lyrics &&
              !item.lyrics.includes("translat") &&
              /\d|[A-z]/.test(item.lyrics)
          );

        const compareTimes = (a, b) => {
          if (a.start < b.start) {
            return -1;
          } else if (a.start > b.start) {
            return 1;
          } else {
            return 0;
          }
        };

        const sortedSubtitleArr = formattedTextArr.sort(compareTimes);

        return sortedSubtitleArr;
      } else {
        if (process.env.NODE_ENV === "production") {
          logger.log(noUsableStatement);
        } else {
          console.log(noUsableStatement);
        }
        return;
      }
    } else {
      if (process.env.NODE_ENV === "production") {
        logger.log(noUsableStatement);
      } else {
        console.log(noUsableStatement);
      }
      return;
    }
  } else {
    const noSubtitlesFoundStatement = "No subtitles found for this video!";

    if (process.env.NODE_ENV === "production") {
      logger.log(noSubtitlesFoundStatement);
    } else {
      console.log(noSubtitlesFoundStatement);
    }
    return;
  }
};

module.exports = getVideoSubtitles;
