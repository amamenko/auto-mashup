const { decode } = require("html-entities");
const { logger } = require("../../logger/logger");
const { installPythonLibrary } = require("../utils/installPythonLibrary");
const secondsToTimestamp = require("../utils/secondsToTimestamp");
const languageCodeArr = require("../arrays/languageCodeArr");
const { runPythonFile } = require("../utils/runPythonFile");
require("dotenv").config();

const getVideoSubtitles = async (video_id) => {
  const getYouTubeTranscript = async (id) => {
    return await installPythonLibrary("youtube_transcript_api")
      .then(async () => {
        return await runPythonFile({
          fileName: "get_transcripts.py",
          arg1: id.replace(/^-+/, "\\-"),
          arg2: languageCodeArr.join(" "),
        }).catch((err) => {
          if (process.env.NODE_ENV === "production") {
            logger("server").error(
              `Received error when getting transcripts for video ID ${id}: ${err.message}`
            );
          } else {
            console.error(err);
          }
        });
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "production") {
          logger("server").error(
            `Received error when installing youtube_transcript_api: ${err.message}`
          );
        } else {
          console.error(err);
        }
      });
  };

  const lyricsArrayAsString = await getYouTubeTranscript(video_id).catch(
    (err) => {
      if (process.env.NODE_ENV === "production") {
        logger("server").error(
          `Received error when getting YouTube transcript for video ID ${video_id}: ${err.message}`
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
          logger("server").info(noUsableStatement);
        } else {
          console.log(noUsableStatement);
        }
        return;
      }
    } else {
      if (process.env.NODE_ENV === "production") {
        logger("server").info(noUsableStatement);
      } else {
        console.log(noUsableStatement);
      }
      return;
    }
  } else {
    const noSubtitlesFoundStatement = "No subtitles found for this video!";

    if (process.env.NODE_ENV === "production") {
      logger("server").info(noSubtitlesFoundStatement);
    } else {
      console.log(noSubtitlesFoundStatement);
    }
    return;
  }
};

module.exports = getVideoSubtitles;
