import pyttsx3
engine = pyttsx3.init()
voices = engine.getProperty('voices')
v = next((v for v in voices if 'female' in v.name.lower() or 'zira' in v.name.lower()), None)
print(v.name if v else 'None')
