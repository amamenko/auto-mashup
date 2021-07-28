import os
import sys

os.system('spleeter separate -p spleeter:2stems -o output {}'.format(sys.argv[1]))