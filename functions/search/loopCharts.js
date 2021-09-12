const getTrack = require("./getTrack");
const { listCharts, getChart } = require("billboard-top-100");

const loopCharts = () => {
  listCharts((err, charts) => {
    if (err) {
      console.log(err);
    } else {
      const filteredCharts = charts.filter((chart) => {
        const filterRegex =
          /(artists*)|(albums*)|(soundtracks*)|(billboard 200)|(social 50)|(jazz)|(gospel)|(christian)|(japan)|(k-pop)|(france)|(germany)|(spain)|(switzerland)|(italy)|(australia)|(argentina)|(tropical)|(regional)|(recurrents)|(bubbling)|(adult)|(excl\.)|(breaker)|(sound)|(triller)|(rhythmic)|(digital)|(lyricfind)|(streaming)/gim;
        const onlyAllowedRegex =
          /(hot dance\/electronic songs)|(dance club songs)|(the official u.k. singles chart)|(mexico airplay)|(billboard canadian hot 100)|(hot latin songs)|(holiday 100)|(lyricfind global)|(greatest of all time alternative songs)|(hot alternative songs)|(hot rap songs)|(hot country songs)|(greatest of all time hot country songs)|(hot r&b\/hip-hop songs)|(hot r&b songs)|(greatest of all time hot r&b\/hip-hop songs)|(rock streaming songs)|(hot hard rock songs)|(greatest of all time mainstream rock songs)/gim;
        const name = chart.name.toLowerCase();

        if (
          name.includes("u.k.") ||
          name.includes("mexico") ||
          name.includes("canadian") ||
          name.includes("canada") ||
          name.includes("latin") ||
          name.includes("holiday") ||
          name.includes("alternative") ||
          name.includes("rap") ||
          name.includes("country") ||
          name.includes("r&b") ||
          name.includes("rock") ||
          name.includes("dance")
        ) {
          return onlyAllowedRegex.test(name) && !filterRegex.test(name);
        } else {
          return !filterRegex.test(name);
        }
      });

      const usedCharts = filteredCharts.map((item) => {
        return {
          name: item.name,
          url: item.url.split("/charts/")[1],
        };
      });

      for (let i = 0; i < usedCharts.length; i++) {
        setTimeout(() => {
          getChart(usedCharts[i].url, (err, chart) => {
            if (err) {
              console.log(err);
            }

            if (chart) {
              if (chart.songs) {
                getChart(
                  usedCharts[i].url,
                  chart.previousWeek.date,
                  (prevErr, prevChart) => {
                    if (prevErr) {
                      console.log(prevErr);
                    }

                    if (prevChart) {
                      const prevSongs = prevChart.songs;

                      console.log(prevSongs);

                      for (let j = 0; j < chart.songs; j++) {
                        // getTrack(
                        //   usedCharts[i].name,
                        //   usedCharts[i].url,
                        //   prevSongs,
                        //   spotifyApi
                        // );
                      }
                    }
                  }
                );
              }
            }
          });
        }, i * 5000);
      }
    }
  });
};

module.exports = loopCharts;
