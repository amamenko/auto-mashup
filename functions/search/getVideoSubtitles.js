const axios = require("axios");
const xml2js = require("xml2js");
const { decode } = require("html-entities");
const languageCodeArr = require("../arrays/languageCodeArr");
const secondsToTimestamp = require("../utils/secondsToTimestamp");

const getVideoSubtitles = async (video_id) => {
  // A call to YouTube's caption list method has a quota cost of 50 units.
  return await axios
    .get(
      `https://www.youtube.com/api/timedtext?&lang=en&type=list&v=${video_id}`
    )
    .then((res) => res.data)
    .then(async (data) => {
      return await xml2js
        .parseStringPromise(data)
        .then(async (result) => {
          if (result) {
            if (result.transcript_list) {
              const subtitleArr = result.transcript_list.track;

              if (subtitleArr && subtitleArr.length > 0) {
                const languageArr = subtitleArr.map(
                  (item) => item["$"].lang_translated
                );
                const langCodeArr = subtitleArr.map(
                  (item) => item["$"].lang_code
                );

                console.log(
                  "This YouTube video has the following language transcripts: " +
                    languageArr.join(", ")
                );

                const foundLanguage = languageCodeArr.find((item) =>
                  langCodeArr.includes(item)
                );

                if (foundLanguage) {
                  const fullLang = subtitleArr.find(
                    (item) => item["$"].lang_code === foundLanguage
                  );
                  console.log(
                    `Getting YouTube subtitle transcripts for ${fullLang["$"].lang_translated}.`
                  );

                  // A call to YouTube's caption download method has a quota cost of 200 units.
                  return await axios
                    .get(
                      `http://video.google.com/timedtext?lang=${foundLanguage}&v=${video_id}`
                    )
                    .then((res) => res.data)
                    .then(async (subtitle_data) => {
                      return await xml2js
                        .parseStringPromise(subtitle_data)
                        .then((subtitle_result) => {
                          if (subtitle_result) {
                            if (subtitle_result.transcript) {
                              if (
                                subtitle_result.transcript.text &&
                                subtitle_result.transcript.text.length > 0
                              ) {
                                const textArr = subtitle_result.transcript.text;

                                if (textArr) {
                                  const formattedTextArr = textArr
                                    .map((item) => {
                                      return {
                                        start: item["$"].start
                                          ? secondsToTimestamp(
                                              Number(item["$"].start)
                                            )
                                          : null,
                                        end:
                                          item["$"].start && item["$"].dur
                                            ? secondsToTimestamp(
                                                Number(item["$"].start) +
                                                  Number(item["$"].dur)
                                              )
                                            : null,
                                        lyrics: item._
                                          ? decode(
                                              item._.toLowerCase()
                                                .replace("\n", " ")
                                                .replace(/(^|\s)♪($|\s)/gi, "")
                                            )
                                          : item._,
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

                                  const sortedSubtitleArr =
                                    formattedTextArr.sort(compareTimes);

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
                              console.log("No usable subtitles found.");
                              return;
                            }
                          } else {
                            console.log("No usable subtitles found.");
                            return;
                          }
                        })
                        .catch((err) => {
                          console.log(
                            `Received error in YouTube subtitle transcript: ${err}`
                          );
                          return;
                        });
                    });
                } else {
                  console.log(
                    "This YouTube video does not have any useable YouTube subtitle transcripts."
                  );
                  return;
                }
              }
            }
          }
        })
        .catch((err) => {
          console.log(`No usable subtitles found. Received error: ${err}`);
          return;
        });
    });
};

module.exports = getVideoSubtitles;
