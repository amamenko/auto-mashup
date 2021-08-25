const { getChart } = require("billboard-top-100");
const getYouTubeAudio = require("./getAudioStems");
const searchYouTube = require("./searchYouTube");
const filterOutArr = require("./arrays/filterOutArr");

const getTrack = (spotifyApi) => {
  getChart(async (err, chart) => {
    if (err) {
      console.log(err);
    } else {
      const topSong = chart.songs[0];

      const splitRegex =
        /(\()|(\))|(, )|( with )|(featuring)|(ft\.)|(&)|x(?!( &)|( and )|( featuring)|( feat\.)|( ft\.)|$)|(feat\.)|( and )/gi;

      const filteredArtist = topSong.artist
        .split(splitRegex)
        .filter(
          (item) => item && !filterOutArr.includes(item.trim().toLowerCase())
        )
        .map((item) => item.trim());

      return await spotifyApi
        .searchTracks(`track:${topSong.title} artist:${filteredArtist[0]}`)
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

              const trackDataJSON = {
                title: topSong.title,
                artist: topSong.artist,
                tempo,
                key,
                mode,
                duration,
                fadeOut,
              };

              console.log(trackDataJSON);

              return await searchYouTube(topSong.title, topSong.artist).then(
                (match) => {
                  console.log({ match });
                }
              );
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
