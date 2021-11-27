const { PythonShell } = require("python-shell");
const { logger } = require("../logger/initializeLogger");
require("dotenv").config();

const installYouTubeTranscriptAPI = () => {
  return new Promise((resolve, reject) => {
    let result;
    const pyshell = new PythonShell("./python_scripts/install_package.py", {
      args: ["youtube_transcript_api"],
    });

    pyshell.on("message", (message) => {
      result = message;
    });

    pyshell.on("stderr", (stderr) => {
      if (process.env.NODE_ENV === "production") {
        logger.error(
          "Something went wrong when installing the Python package youtube_transcript_api within the file 'installYouTubeTranscriptAPI.js'",
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
        resolve(result);
      }
    });
  });
};

module.exports = installYouTubeTranscriptAPI;
