const removeAccents = require("remove-accents");
const filterOutArr = require("../arrays/filterOutArr");

const getEachArtist = (artist) => {
  const splitRegex =
    /(\()|(\))|(, )|( with )|(featuring)|(ft\.)|(&)|x(?!( &)|( and )|( featuring)|( feat\.)|( ft\.)|$)|(feat\.)|( and )/gi;

  const artistArr = artist
    .split(splitRegex)
    .filter((item) => item && !filterOutArr.includes(item.trim().toLowerCase()))
    .map((item) => item.trim());

  return {
    artist1: artistArr[0] ? removeAccents(artistArr[0]) : "",
    artist2: artistArr[1] ? removeAccents(artistArr[1]) : "",
    artist3: artistArr[2] ? removeAccents(artistArr[2]) : "",
  };
};

module.exports = getEachArtist;
