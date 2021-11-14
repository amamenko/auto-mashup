const { PythonShell } = require("python-shell");
const languageCodeArr = require("../arrays/languageCodeArr");

const getTranscripts = (videoId) => {
  const preferredLanguages = languageCodeArr.join(" ");

  return new Promise((resolve, reject) => {
    let result;
    const pyshell = new PythonShell("./python_scripts/get_transcripts.py", {
      args: [videoId.replace(/^-+/, "\\-"), preferredLanguages],
    });

    pyshell.on("message", (message) => {
      result = message;
    });

    pyshell.on("stderr", (stderr) => {
      console.log(stderr);
    });

    pyshell.end((err, code, signal) => {
      if (err) {
        reject(err);
      } else {
        console.log("Transcript successfully acquired.");
        resolve(result);
      }
    });
  });
};

module.exports = getTranscripts;
