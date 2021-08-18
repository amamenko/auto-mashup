const ytdl = require("ytdl-core");
const getTrackTimes = require("./getTrackTimes");
const languageCodeArr = require("./languageCodeArr");
const https = require("https");
const fs = require("fs");
const path = require("path");
const subsrt = require("subsrt");

const getSubtitleJSON = async (videoID, title, artist) => {
  const format = "vtt";

  // await ytdl.getInfo(videoID).then((info) => {
  //   const tracks =
  //     info.player_response.captions.playerCaptionsTracklistRenderer
  //       .captionTracks;

  //   if (tracks && tracks.length) {
  //     console.log(
  //       "Found captions for",
  //       tracks.map((t) => t.name.simpleText).join(", ")
  //     );

  //     const track = tracks.find((t) => {
  //       const matchedLang = languageCodeArr.find(
  //         (lang) => t.languageCode === lang
  //       );
  //       return matchedLang;
  //     });

  //     if (track) {
  //       console.log("Retrieving captions:", track.name.simpleText);
  //       console.log("URL", track.baseUrl);

  const output = `YouTubeSubtitles.${format}`;

  //       console.log("Saving to", output);

  const pathOfFile = path.resolve(__dirname, output);

  //       https.get(
  //         `${track.baseUrl}&fmt=${format !== "xml" ? format : ""}`,
  //         (res) => {
  //           res.pipe(fs.createWriteStream(pathOfFile)).on("finish", () => {
  const vttSubtitles = fs.readFileSync(pathOfFile, "utf8");

  // Convert .vtt to .json
  const newJSONFile = subsrt.convert(vttSubtitles, {
    format: "json",
  });

  const parsedJSON = JSON.parse(newJSONFile);

  if (parsedJSON) {
    // Delete .vtt file, we already have it in JSON form
    // fs.unlinkSync(pathOfFile);
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

      return getTrackTimes(sortedLyricsArr, title, artist);
    }
  }
  //           });
  //         }
  //       );
  //     } else {
  //       console.log(
  //         "Could not find captions in list:",
  //         languageCodeArr.join(", ")
  //       );
  //       return;
  //     }
  //   } else {
  //     console.log("No captions found for this video");
  //     return;
  //   }
  // });
};

module.exports = getSubtitleJSON;
