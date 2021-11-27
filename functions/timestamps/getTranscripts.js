const { PythonShell } = require("python-shell");
const languageCodeArr = require("../arrays/languageCodeArr");
const { logger } = require("../logger/initializeLogger");
require("dotenv").config();

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
      if (process.env.NODE_ENV === "production") {
        logger.error(
          `Something went wrong when running the Python script get_transcripts.py within the function "getTranscripts.js" for video ID "${videoId}"`,
          {
            indexMeta: true,
            meta: {
              message: stderr.message,
            },
          }
        );
      } else {
        console.error(stderr);
      }
    });

    pyshell.end((err, code, signal) => {
      if (err) {
        reject(err);
      } else {
        const successStatement = "Transcript successfully acquired.";

        if (process.env.NODE_ENV === "production") {
          logger.log(successStatement);
        } else {
          console.log(successStatement);
        }
        resolve(result);
      }
    });
  });
};

module.exports = getTranscripts;
