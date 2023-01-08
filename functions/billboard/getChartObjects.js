const axios = require("axios");
const cheerio = require("cheerio");
const { logger } = require("../../logger/logger");
require("dotenv").config();

const BILLBOARD_BASE_URL = "https://www.billboard.com";

const getChartObjects = async (encodedChart, ms) => {
  return new Promise(async (resolve, reject) => {
    const timeoutPromiseFunction = (ms) => {
      return new Promise((resolve) => setTimeout(resolve, ms));
    };

    await timeoutPromiseFunction(ms);

    const fullURL = process.env.BILLBOARD_PMC_AJAX_URL + encodedChart;

    const newHTML = await axios
      .get(fullURL)
      .then((res) => res.data)
      .catch((err) => {
        if (process.env.NODE_ENV === "production") {
          logger("server").error(
            `Something went wrong when performing a GET request to the Billboard URL "${fullURL}" in the getChartObjects function: ${err.message}`
          );
        } else {
          console.error(err);
        }
      });

    if (newHTML) {
      const htmlObj = newHTML;

      if (htmlObj.html) {
        const $2 = cheerio.load(htmlObj.html);

        const allResults = $2(".c-span");

        const allCharts = [];

        for (const result of allResults) {
          if (result.children[0] && result.parent.attribs.href) {
            let urlEnding = result.parent.attribs.href;

            if (urlEnding[urlEnding.length - 1] === "/") {
              urlEnding = urlEnding.slice(0, -1);
            }

            allCharts.push({
              name: result.children[0].data.trim(),
              url: `${
                urlEnding.includes("billboard.com") ? "" : BILLBOARD_BASE_URL
              }${urlEnding}`,
            });
          }
        }

        resolve(allCharts);
      } else {
        resolve();
      }
    } else {
      resolve();
    }
  });
};

module.exports = { getChartObjects };
