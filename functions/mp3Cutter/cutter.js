// Taken from mp3-cutter and modified to add callback function
const fs = require("fs");
const Duration = require("./duration.js");
const { logger } = require("../logger/initializeLogger");
require("dotenv").config();

class MP3Cutter {
  /**
   * Cuts mp3 files and creates a new file with it.
   *
   * @param {{src:String, target:String, start:Number, end:Number: callback:()=>{}}} o
   */
  static cut(o = {}) {
    var src = o.src,
      size = fs.statSync(src).size,
      { duration, offset } = Duration.getDuration(src),
      startTime = o.start || 0,
      endTime = o.end || duration,
      valuePerSecond = (size - offset) / duration,
      start = startTime * valuePerSecond,
      end = endTime * valuePerSecond;

    var fd = fs.openSync(src, "r");
    try {
      var offsetBuffer = Buffer.alloc(offset);
      fs.readSync(fd, offsetBuffer, 0, offsetBuffer.length, offset);
      fs.writeFileSync(o.target, offsetBuffer);

      var audioBuffer = Buffer.alloc(end - start);
      fs.readSync(
        fd,
        audioBuffer,
        0,
        audioBuffer.length,
        parseInt(start + offset)
      );
      fs.writeFileSync(o.target, audioBuffer);
      o.callback();
    } catch (err) {
      if (process.env.NODE_ENV === "production") {
        logger.error(
          "Error writing file with Buffer within mp3Cutter's 'cutter' function!",
          {
            indexMeta: true,
            meta: {
              message: err.message,
            },
          }
        );
      } else {
        console.error(err);
      }
    } finally {
      fs.closeSync(fd);
    }
  }
}

module.exports = MP3Cutter;
