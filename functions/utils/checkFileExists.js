const fs = require("fs");

const checkFileExists = (file) => {
  return fs.promises
    .access(file, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
};

module.exports = checkFileExists;
