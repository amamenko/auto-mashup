const { PythonShell } = require("python-shell");

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
      console.log(stderr);
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
