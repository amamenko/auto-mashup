const { PythonShell } = require("python-shell");
const fs = require("fs");
const path = require("path");

const spleeterOnChunks = async (numberOfChunks) => {
  // Make sure Spleeter is installed
  PythonShell.run(
    "./python_scripts/install_package.py",
    { args: ["spleeter"] },
    (err) => {
      if (err) {
        throw err;
      } else {
        console.log("Splitting audio file.");

        for (let i = 0; i < numberOfChunks; i++) {
          const filePath = path.resolve(
            __dirname,
            "output",
            `chunk0${i < 10 ? "0" + i : i}.mp3`
          );

          setTimeout(() => {
            // Split audio into stems and clean up
            PythonShell.run(
              "./python_scripts/spleeter_stems.py",
              {
                args: [filePath],
              },
              (err) => {
                if (err) {
                  throw err;
                } else {
                  console.log("Successfully split track into two stems");

                  if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                  }

                  if (fs.existsSync("pretrained_models")) {
                    fs.rmSync("pretrained_models", { recursive: true });
                    console.log(
                      "Removed pretrained_models directory and local audio file"
                    );
                  }
                }
              }
            );
          }, 8000);
        }
      }
    }
  );
};

module.exports = { spleeterOnChunks };
