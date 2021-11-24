const axios = require("axios");
const cheerio = require("cheerio");
const { getChartObjects } = require("./getChartObjects");

const BILLBOARD_BASE_URL = "http://www.billboard.com";
const BILLBOARD_CHARTS_URL = `${BILLBOARD_BASE_URL}/charts/`;

const listCharts = async (cb) => {
  if (typeof cb !== "function") {
    cb("Specified callback is not a function.", null);
    return;
  }

  const chartsHTML = await axios
    .get(BILLBOARD_CHARTS_URL)
    .then((res) => res.data)
    .catch((e) => console.error(e));

  if (chartsHTML) {
    const $ = cheerio.load(chartsHTML);

    const charts = [];

    const chartObjects = $(".chart-type-weekly");

    const allCharts = [];

    for (const chartObject of chartObjects) {
      if (chartObject) {
        if (chartObject.children) {
          for (const child of chartObject.children) {
            if (child.attribs) {
              if (child.attribs.value) {
                const lowerName = child.attribs.value.toLowerCase();

                if (
                  !lowerName.includes("bandsintown") &&
                  !lowerName.includes("additional") &&
                  !lowerName.includes("christian") &&
                  !lowerName.includes("web") &&
                  !lowerName.includes("break") &&
                  !lowerName.includes("jazz") &&
                  !lowerName.includes("classical") &&
                  !lowerName.includes("holiday") &&
                  !lowerName.includes("trending")
                ) {
                  allCharts.push(child.attribs.value);
                }
              }
            }
          }
        }
      }
    }

    const allChartsEncoded = allCharts.map(
      (chart) => "selected_category-" + encodeURIComponent(chart)
    );

    const allPromises = [];

    for (let i = 0; i < allChartsEncoded.length; i++) {
      const currentPromise = getChartObjects(allChartsEncoded[i], i * 100);
      allPromises.push(currentPromise);

      const currentCharts = await currentPromise;

      if (currentCharts.length > 0) {
        for (const chart of currentCharts) {
          charts.push(chart);
        }
      }
    }

    Promise.all(allPromises.map((p) => p.catch((error) => null)))
      .then((arr) => {
        return arr;
      })
      .catch((err) => {
        console.log(err);
      });

    // Callback with charts if charts array was populated
    if (charts.length > 0) {
      cb(null, charts);
    } else {
      cb("No charts found.", null);
    }
  }
};

module.exports = { listCharts };
