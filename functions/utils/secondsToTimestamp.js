const secondsToTimestamp = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds - hours * 3600) / 60);
  const seconds = totalSeconds - (hours * 3600 + minutes * 60);

  const timestampArr = [
    hours ? "0" + hours : "00",
    minutes === 0 ? "00" : minutes < 10 ? "0" + minutes : minutes,
    seconds === 0
      ? "00"
      : seconds < 10
      ? "0" + seconds.toFixed(3)
      : seconds.toFixed(3),
  ];

  return timestampArr.join(":");
};

module.exports = secondsToTimestamp;
