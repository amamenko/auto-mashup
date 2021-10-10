const ffmpeg = require("fluent-ffmpeg");

const mixTracks = () => {
  const start = Date.now();

  // Object.filter = (obj, predicate) =>
  //   Object.keys(obj)
  //     .filter((key) => predicate(obj[key]))
  //     .reduce((res, key) => ((res[key] = obj[key]), res), {});

  // ffmpeg.getAvailableFilters(function (err, filters) {
  //   console.log("Available filters:");
  //   if (filters) {
  //     var filtered = Object.filter(
  //       filters,
  //       (filter) => filter.input === "audio"
  //     );

  //     console.dir(filtered);
  //   }
  // });

  ffmpeg()
    .input("accompaniment")
    .input("vox")
    .complexFilter([
      // Pitch up the vocals
      {
        filter: "rubberband=pitch=1.5",
        inputs: "1:a",
        outputs: "vox",
      },
      {
        filter: "atrim=start=20:end=30",
        inputs: "vox",
      },
      // Mix instrumentals and pitched vocals together
      // {
      //   filter: "amix=inputs=2:duration=first",
      //   inputs: ["vox", "0:a"]
      // }
    ])
    .output("./output1.mp3")
    .on("progress", (p) => {
      console.log(`${p.targetSize}kb downloaded`);
    })
    .on("end", () => {
      console.log(
        `\nDone in ${(Date.now() - start) / 1000}s\nSaved to output.mp3.`
      );
    })
    .on("error", function (err) {
      console.log("Process exited with error: " + err);
    })
    .run();
};

module.exports = mixTracks;
