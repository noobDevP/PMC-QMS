import sys
import os
import glob
import time
from gtts import gTTS

if sys.platform == "win32":
    import pyttsx3

def cleanup_old_tts(uploads_dir):
    try:
        now = time.time()
        for ext in ['*.wav', '*.mp3']:
            pattern = os.path.join(uploads_dir, f'tts_{ext[2:]}')
            for f in glob.glob(pattern):
                if os.path.isfile(f):
                    if os.stat(f).st_mtime < now - 3600:
                        os.remove(f)
    except Exception as e:
        pass

def generate_tts(text, filepath):
    try:
        if sys.platform == "win32":
            engine = pyttsx3.init()
            engine.save_to_file(text, filepath)
            engine.runAndWait()
            return True
        else:
            tts = gTTS(text=text, lang='en', slow=False)
            tts.save(filepath)
            return True
    except Exception as e:
        print(f"TTS Error: {e}")
        return False
