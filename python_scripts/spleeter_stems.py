import os
import sys
print(sys.argv[1])
os.system('spleeter separate -p spleeter:2stems -o output {}'.format(sys.argv[1]))