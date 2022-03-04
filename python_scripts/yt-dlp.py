import os
import sys

os.system('yt-dlp "{}" --extract-audio --audio-format mp3 -o "{}"'.format(sys.argv[1], sys.argv[2]))