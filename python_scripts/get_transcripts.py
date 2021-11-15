import os
import sys 

os.system('youtube_transcript_api "{}" --languages {} --format json'.format(sys.argv[1], sys.argv[2]))