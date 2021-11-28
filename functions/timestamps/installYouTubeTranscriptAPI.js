const { PythonShell } = require("python-shell");
require("dotenv").config();

const installYouTubeTranscriptAPI = () => {
  // In production server, installation is handled ahead of time
  return new Promise((resolve, reject) => {
    let result;
    const pyshell = new PythonShell("./python_scripts/install_package.py", {
      args: ["youtube_transcript_api"],
    });

    pyshell.on("message", (message) => {
      result = message;
    });

    pyshell.on("stderr", (stderr) => {
      if (process.env.NODE_ENV !== "production") {
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
