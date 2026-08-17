from gtts import gTTS
import os
import glob
import time

def cleanup_old_tts(uploads_dir):
    try:
        now = time.time()
        # Find all wav or mp3 files starting with tts_
        for ext in ['*.wav', '*.mp3']:
            pattern = os.path.join(uploads_dir, f'tts_{ext[2:]}')
            for f in glob.glob(pattern):
                if os.path.isfile(f):
                    if os.stat(f).st_mtime < now - 3600:
                        os.remove(f)
    except Exception as e:
        pass # Silently fail cleanup

def generate_tts(text, filepath):
    try:
        # Generate speech using Google TTS (requires internet)
        tts = gTTS(text=text, lang='en', slow=False)
        tts.save(filepath)
        return True
    except Exception as e:
        print(f"TTS Error: {e}")
        return False
