import os
import sys

os.system('spleeter separate -p spleeter:2stems -o output {} -c mp3'.format(sys.argv[1]))