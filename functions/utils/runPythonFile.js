const { PythonShell } = require("python-shell");
const { logger } = require("../../logger/logger");
require("dotenv").config();

const runPythonFile = (argsObj) => {
  const { fileName, arg1, arg2 } = argsObj;

  return new Promise((resolve, reject) => {
    let result;
    const pyshell = new PythonShell(`./python_scripts/${fileName}`, {
      args: arg2 ? [arg1, arg2] : [arg1],
    });

    pyshell.on("message", (message) => {
      result = message;
    });

    pyshell.on("stderr", (stderr) => {
      if (process.env.NODE_ENV === "production") {
        logger("server").error(
          `Something went wrong when running the Python script ${fileName} within the function "runPythonFile.js": ${stderr.message}`
        );
      } else {
        console.error(stderr);
      }
    });

    pyshell.end((err, code, signal) => {
      if (err) {
        reject(err);
      } else {
        const successStatement = `Successfully ran ${fileName}.`;

        if (process.env.NODE_ENV === "production") {
          logger("server").info(successStatement);
        } else {
          console.log(successStatement);
        }
        resolve(result);
      }
    });
  });
};

module.exports = { runPythonFile };
