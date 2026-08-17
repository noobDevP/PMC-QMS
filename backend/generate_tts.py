import pyttsx3
import sys
import os
import glob
import time

def cleanup_old_tts(uploads_dir):
    try:
        now = time.time()
        # Find all wav files starting with tts_
        pattern = os.path.join(uploads_dir, 'tts_*.wav')
        for f in glob.glob(pattern):
            if os.path.isfile(f):
                # If older than 1 hour (3600 seconds)
                if os.stat(f).st_mtime < now - 3600:
                    os.remove(f)
    except Exception as e:
        pass # Silently fail cleanup

def generate_tts(text, filepath):
    try:
        engine = pyttsx3.init()
        # Set female voice if available
        voices = engine.getProperty('voices')
        for voice in voices:
            if 'female' in voice.name.lower() or 'zira' in voice.name.lower():
                engine.setProperty('voice', voice.id)
                break
        
        # Slow down the speech rate (default is usually 200)
        engine.setProperty('rate', 150)
        
        # Save to file
        engine.save_to_file(text, filepath)
        engine.runAndWait()
        print(f"SUCCESS:{filepath}")
    except Exception as e:
        print(f"ERROR:{str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python generate_tts.py <text> <filepath>")
        sys.exit(1)
        
    text = sys.argv[1]
    filepath = sys.argv[2]
    
    # Run cleanup
    cleanup_old_tts(os.path.dirname(filepath))
    
    generate_tts(text, filepath)
