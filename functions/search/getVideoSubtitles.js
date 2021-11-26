const { decode } = require("html-entities");
const getTranscripts = require("../timestamps/getTranscripts");
const installYouTubeTranscriptAPI = require("../timestamps/installYouTubeTranscriptAPI");
const secondsToTimestamp = require("../utils/secondsToTimestamp");

const getVideoSubtitles = async (video_id) => {
  const getYouTubeTranscript = async (id) => {
    return await installYouTubeTranscriptAPI()
      .then(async () => {
        return await getTranscripts(id).catch((e) => console.error(e));
      })
      .catch((e) => console.error(e));
  };

  const lyricsArrayAsString = await getYouTubeTranscript(video_id).catch((e) =>
    console.error(e)
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
        console.log("No usable subtitles found.");
        return;
      }
    } else {
      console.log("No usable subtitles found.");
      return;
    }
  } else {
    console.log("No subtitles found for this video!");
    return;
  }
};

module.exports = getVideoSubtitles;
