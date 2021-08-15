// Code taken from https://github.com/valerebron/usetube and changed to include only subtitled videos

const getData = require("./helpers/getData");

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
  } catch (e) {
    console.log("cannot get date for " + id + ", try again");
    // console.log(e)
  }
};

module.exports = getVideoDate;
