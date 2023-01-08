const getData = require("./helpers/getData");
const { logger } = require("../../logger/logger");
require("dotenv").config();

const getVideoDate = async (id) => {
  try {
    let publishText = await getData(
      "https://m.youtube.com/watch?v=" + id + "&type=date"
    );
    publishText.replace("-", "/");
    publishText +=
      " " +
      Math.floor(Math.random() * 24) +
      ":" +
      Math.floor(Math.random() * 60) +
      ":" +
      Math.floor(Math.random() * 60);
    return new Date(Date.parse(publishText));
  } catch (err) {
    const failureStatement = "cannot get date for " + id + ", try again";

    if (process.env.NODE_ENV === "production") {
      logger("server").info(failureStatement);
    } else {
      console.log(failureStatement);
    }
  }
};

module.exports = getVideoDate;
