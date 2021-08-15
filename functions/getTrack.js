const { getChart } = require("billboard-top-100");
const getYouTubeAudio = require("./getAudioStems");
const searchYouTube = require("./searchYouTube");

const getTrack = (spotifyApi) => {
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
            async (data) => {
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
              const startOfFinal8Bars = data.body.bars[numberOfBars - 8].start;

              const trackDataJSON = {
                title: topSong.title,
                artist: topSong.artist,
                tempo,
                key,
                mode,
                duration,
                fadeOut,
                vocalStart,
                startOfFinal8Bars,
              };

              await searchYouTube(topSong.title, topSong.artist, duration);
              //   .then(
              //   (id) => getYouTubeAudio(id)
              // );

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

module.exports = getTrack;
