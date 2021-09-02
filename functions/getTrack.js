const { getChart } = require("billboard-top-100");
const getAudioStems = require("./getAudioStems");
const searchYouTube = require("./searchYouTube");
const filterOutArr = require("./arrays/filterOutArr");

const getTrack = (currentChart, spotifyApi) => {
  getChart(currentChart, async (err, chart) => {
    if (err) {
      console.log(err);
    } else {
      const topSong = chart.songs[0];
      const songRank = chart.songs[0].rank;
      const songCover = chart.songs[0].cover;

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

              const tempo = trackDetails.tempo;
              const key = allKeys[trackDetails.key];
              const mode = trackDetails.mode === 1 ? "major" : "minor";

              const trackDataJSON = {
                title: topSong.title,
                artist: topSong.artist,
                rank: songRank,
                cover: songCover,
                tempo,
                key,
                mode,
                currentChart,
              };

              return await searchYouTube(topSong.title, topSong.artist).then(
                (match) => {
                  if (match.arr.length >= 4) {
                    const matchID = match.id;
                    const matchDuration = match.duration;
                    const matchArr = match.arr.map((item) => {
                      if (item.end) {
                        return {
                          sectionName: item.sectionName,
                          start: item.start,
                          end: item.end,
                        };
                      } else {
                        return {
                          sectionName: item.sectionName,
                          start: item.start,
                        };
                      }
                    });

                    getAudioStems(
                      matchID,
                      matchDuration,
                      matchArr,
                      trackDataJSON
                    );
                  } else {
                    return;
                  }
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
