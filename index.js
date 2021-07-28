const express = require("express");
const app = express();
const fs = require("fs");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const { PythonShell } = require("python-shell");
const { getChart } = require("billboard-top-100");
const SpotifyWebApi = require("spotify-web-api-node");
require("dotenv").config();

const port = process.env.PORT || 4000;

var spotifyCredentials = {
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
};

const spotifyApi = new SpotifyWebApi(spotifyCredentials);

const getTrack = () => {
  getChart((err, chart) => {
    if (err) {
      console.log(err);
    } else {
      const topSong = chart.songs[0];

      spotifyApi
        .searchTracks(`track:${topSong.title} artist:${topSong.artist}`)
        .then(
          (data) => {
            const firstResultID = data.body.tracks.items[0].id;
            return firstResultID;
          },
          (err) => {
            console.log("Something went wrong!", err);
          }
        )
        .then((id) => {
          spotifyApi.getAudioAnalysisForTrack(id).then(
            (data) => {
              const allKeys = [
                "C",
                "C#",
                "D",
                "D#",
                "E",
                "F",
                "F#",
                "G",
                "G#",
                "A",
                "A#",
                "B",
              ];
              const trackDetails = data.body.track;

              const tempo = Math.round(trackDetails.tempo);
              const key = allKeys[trackDetails.key];
              const mode = trackDetails.mode === 1 ? "major" : "minor";
              const duration = trackDetails.duration;
              const fadeOut = trackDetails.start_of_fade_out;
              const vocalStart = data.body.sections[1].start;
              const numberOfBars = data.body.bars.length;
              const startOfFinal4Bars = data.body.bars[numberOfBars - 4].start;

              const trackDataJSON = {
                tempo,
                key,
                mode,
                duration,
                fadeOut,
                vocalStart,
                startOfFinal4Bars,
              };

              console.log(trackDataJSON);
            },
            (err) => {
              done(err);
            }
          );
        });
    }
  });
};

if (spotifyApi.getAccessToken()) {
  getTrack();
} else {
  // Retrieve an access token
  spotifyApi
    .clientCredentialsGrant()
    .then(
      (data) => {
        console.log("The access token expires in " + data.body["expires_in"]);
        console.log("The access token is " + data.body["access_token"]);

        // Save the access token so that it's used in future calls
        spotifyApi.setAccessToken(data.body["access_token"]);
      },
      (err) => {
        console.log(
          "Something went wrong when retrieving an access token",
          err.message
        );
      }
    )
    .then(() => getTrack());
}

const getYouTubeAudio = async (videoID) => {
  const basicInfo = await ytdl.getBasicInfo(videoID);

  if (basicInfo) {
    if (basicInfo.videoDetails) {
      const title = basicInfo.videoDetails.title;
      console.log(`Now downloading video: ${title}`);
    }
  }

  // Download audio from YouTube
  let stream = ytdl(videoID, {
    quality: "highestaudio",
  });

  const filePath = "YouTubeAudio.mp3";

  let start = Date.now();
  ffmpeg(stream)
    .audioBitrate(128)
    .save(filePath)
    .on("progress", (p) => {
      console.log(`${p.targetSize}kb downloaded`);
    })
    .on("end", () => {
      console.log(
        `\nDone in ${(Date.now() - start) / 1000}s\nSaved to ${filePath}.`
      );

      // Make sure Spleeter, madmom is installed
      PythonShell.run(
        "./python_scripts/install_package.py",
        {
          args: ["spleeter"],
        },
        (err) => {
          if (err) {
            throw err;
          } else {
            console.log("Splitting audio file.");
            // Get audio file
            const spleeterOptions = {
              args: [filePath],
            };

            // Split audio into stems and clean up
            PythonShell.run(
              "./python_scripts/spleeter_stems.py",
              spleeterOptions,
              (err) => {
                if (err) {
                  throw err;
                } else {
                  console.log("Successfully split track into two stems");
                  fs.unlinkSync(filePath);
                  fs.rmSync("pretrained_models", { recursive: true });
                  console.log(
                    "Removed pretrained_models directory and local audio file"
                  );
                }
              }
            );
          }
        }
      );
    });
};

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
