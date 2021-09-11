const express = require("express");
const app = express();
const SpotifyWebApi = require("spotify-web-api-node");
const getTrack = require("./functions/getTrack");
const { listCharts, getChart } = require("billboard-top-100");
const fs = require("fs");
const path = require("path");
const contentful = require("contentful");
require("dotenv").config();

const port = process.env.PORT || 4000;

const spotifyCredentials = {
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
};

const spotifyApi = new SpotifyWebApi(spotifyCredentials);

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
                  }

                  // getTrack(
                  //   usedCharts[i].name,
                  //   usedCharts[i].url,
                  //   prevSongs,
                  //   spotifyApi
                  // );
                }
              );
            }
          }
        });
      }, i * 5000);
    }
  }
});

// const client = contentful.createClient({
//   space: process.env.CONTENTFUL_SPACE_ID,
//   accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
// });

// client
//   .getEntries({
//     select: "fields.charts",
//     content_type: "song",
//   })
//   .then((res) => {
//     if (res.items) {
//       res.items.forEach((item) => {
//         if (item.fields) {
//           console.log({
//             charts: item.fields.charts,
//           });
//         }
//       });
//     }
//   })
//   .catch((err) => console.log(err));

// if (spotifyApi.getAccessToken()) {
//   getTrack("The Hot 100", "hot-100", null, spotifyApi);
// } else {
//   // Retrieve an access token
//   spotifyApi
//     .clientCredentialsGrant()
//     .then(
//       (data) => {
//         console.log("The access token expires in " + data.body["expires_in"]);
//         console.log("The access token is " + data.body["access_token"]);

//         // Save the access token so that it's used in future calls
//         spotifyApi.setAccessToken(data.body["access_token"]);
//       },
//       (err) => {
//         console.log(
//           "Something went wrong when retrieving an access token",
//           err.message
//         );
//       }
//     )
//     .then(() => getTrack("The Hot 100", "hot-100", null, spotifyApi));
// }

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
