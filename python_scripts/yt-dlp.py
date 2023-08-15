import os
import sys

os.system('yt-dlp "{}" --extract-audio --audio-format mp3 --cookies-from-browser chrome --add-header "Accept:*/*" -o "{}"'.format(sys.argv[1], sys.argv[2]))