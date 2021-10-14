const ytdl = require("ytdl-core");
const subsrt = require("subsrt");
const axios = require("axios");
const languageCodeArr = require("../arrays/languageCodeArr");
const getTrackTimes = require("../timestamps/getTrackTimes");
const getEachArtist = require("./getEachArtist");

const getSubtitleJSON = async (videoID, videoDuration, title, artist) => {
  const reqOptions = {
    requestOptions: {
      headers: {
        cookie: process.env.YOUTUBE_COOKIES,
      },
    },
  };

  const format = "vtt";

  return await ytdl.getInfo(videoID).then(async (info) => {
    const tracks =
      info.player_response.captions.playerCaptionsTracklistRenderer
        .captionTracks;

    if (tracks && tracks.length) {
      console.log(
        "Found captions for",
        tracks.map((t) => t.name.simpleText).join(", ")
      );

      const track = tracks.find((t) => {
        const matchedLang = languageCodeArr.find(
          (lang) => t.languageCode === lang
        );
        return matchedLang;
      });

      if (track) {
        console.log("Retrieving captions:", track.name.simpleText);
        console.log("URL", track.baseUrl);

        const result = await axios
          .get(`${track.baseUrl}&fmt=${format !== "xml" ? format : ""}`)
          .then(async (res) => {
            const vttSubtitles = res.data;

            // Convert .vtt to .json
            const newJSONFile = subsrt.convert(vttSubtitles, {
              format: "json",
            });

            const parsedJSON = JSON.parse(newJSONFile);

            if (parsedJSON) {
              if (parsedJSON.length > 0) {
                const subtitleData = parsedJSON[0].data;
                const subtitleArr = subtitleData.split("\n\n");

                const lyricsArr = [];

                for (let i = 0; i < subtitleArr.length; i++) {
                  const currentItem = subtitleArr[i];
                  const currentSections = currentItem.split("\n");
                  const timeSplit = currentSections[0].split(" --> ");
                  const newLyrics = currentSections
                    .slice(1)
                    .join(" ")
                    .toLowerCase()
                    .replace(/(^|\s)♪($|\s)/gi, "");

                  if (currentItem[0] === "0") {
                    if (/\d|[A-z]/.test(newLyrics)) {
                      lyricsArr.push({
                        start: timeSplit[0],
                        end: timeSplit[1],
                        lyrics: newLyrics,
                      });
                    }
                  }
                }

                const compareTimes = (a, b) => {
                  if (a.start < b.start) {
                    return -1;
                  } else if (a.start > b.start) {
                    return 1;
                  } else {
                    return 0;
                  }
                };

                const sortedLyricsArr = lyricsArr.sort(compareTimes);

                const { artist1, artist2, artist3 } = getEachArtist(artist);

                const times = await getTrackTimes(
                  sortedLyricsArr,
                  videoDuration,
                  title,
                  artist1,
                  artist2,
                  artist3
                );

                return times;
              }
            }
          });

        return result;
      } else {
        console.log(
          "Could not find captions in list:",
          languageCodeArr.join(", ")
        );
        return;
      }
    } else {
      console.log("No captions found for this video");
      return;
    }
  });
};

module.exports = getSubtitleJSON;
