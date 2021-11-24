const cheerio = require("cheerio");
const request = require("request");
const { format, addDays, startOfWeek } = require("date-fns");

const BILLBOARD_BASE_URL = "http://www.billboard.com";
const BILLBOARD_CHARTS_URL = `${BILLBOARD_BASE_URL}/charts/`;

const getChart = (name, date, cb) => {
  let chartName = name;
  let chartDate = date;
  let callback = cb;
  // Check if name was specified
  if (typeof name === "function") {
    // If name not specified, default to hot-100 chart for current week,
    // and set callback method accordingly
    callback = name;
    chartName = "hot-100";
    chartDate = "";
  }
  // Check if date was specified
  if (typeof date === "function") {
    // If date not specified, default to specified chart for current week,
    // and set callback method accordingly
    callback = date;
    chartDate = "";
  }
  const chart = {};

  chart.songs = [];

  // Build request URL string for specified chart and date
  const requestURL = `${BILLBOARD_CHARTS_URL}${chartName}/${chartDate}`;

  request(requestURL, (error, response, html) => {
    if (error) {
      callback(error, null);
      return;
    }

    const $ = cheerio.load(html);
    const taglineText = $(".c-tagline").text().toLowerCase();
    const taglineArr = taglineText.split("week of");

    const upcomingSaturday = format(
      addDays(
        startOfWeek(new Date(), {
          weekStartsOn: 6,
        }),
        7
      ),
      "yyyy-MM-dd"
    );

    if (taglineArr[1]) {
      const dateArr = taglineArr[1].trim().split(",");

      if (dateArr[0] && dateArr[1]) {
        const firstPart = dateArr[0];
        const secondPart = dateArr[1].trim().split(/\D+/g)[0];

        const formattedDate = format(
          new Date(firstPart + " " + secondPart),
          "yyyy-MM-dd"
        );

        // get chart week
        chart.week = formattedDate;
      } else {
        chart.week = upcomingSaturday;
      }
    } else {
      chart.week = upcomingSaturday;
    }

    let chartListItems;

    try {
      chartListItems = $(".chart-results-list")[0].children;
    } catch (err) {
      chartListItems = $(".chart-list__element");
    }
    if (!(chartListItems && chartListItems.length)) {
      chartListItems = $(".chart-list-item__first-row");
    }

    for (let i = 0; i < chartListItems.length; i += 1) {
      let rank = $("span.c-label", chartListItems[i]).text().trim();

      if (rank) {
        const title = $("h3.c-title", chartListItems[i]).text().trim();
        const artist = $("h3.c-title+span", chartListItems[i]).text().trim();
        const cover = $("img", chartListItems[i]).eq(0).attr("data-lazy-src");

        const rankArr = rank.split(/\D+/gim);

        if (Number(rankArr[0])) {
          rank = Number(rankArr[0]);
        }

        chart.songs.push({
          rank,
          title,
          artist,
          cover,
        });
      }
    }

    // callback with chart if chart.songs array was populated
    if (chart.songs.length > 1) {
      callback(null, chart);
    } else {
      callback("Songs not found.", null);
    }
  });
};

module.exports = { getChart };
