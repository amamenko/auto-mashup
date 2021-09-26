// Code taken from https://github.com/valerebron/usetube and changed to include only subtitled videos

const findVal = (object, key) => {
  var value;
  Object.keys(object).some(function (k) {
    if (k === key) {
      value = object[k];
      return true;
    }
    if (object[k] && typeof object[k] === "object") {
      value = findVal(object[k], key);
      return value !== undefined;
    }
  });
  return value;
};

module.exports = findVal;
