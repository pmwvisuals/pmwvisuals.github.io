"""Create small disposable media inputs for local tool QA, outside the site."""
from pathlib import Path
import math
import struct
import wave
from PIL import Image, ImageDraw

site = Path(__file__).resolve().parents[2]
folder = site.parents[1] / 'audit/tools-editorial-20261006/fixtures'
folder.mkdir(parents=True, exist_ok=True)
with wave.open(str(folder / 'tone.wav'), 'wb') as wav:
    wav.setnchannels(1)
    wav.setsampwidth(2)
    wav.setframerate(44100)
    wav.writeframes(b''.join(struct.pack('<h', int(8000 * math.sin(2 * math.pi * 440 * n / 44100))) for n in range(44100)))
frames = []
for offset in (8, 24, 40):
    image = Image.new('RGB', (64, 64), '#101920')
    ImageDraw.Draw(image).rectangle((offset, 16, offset + 12, 48), fill='#dfc98d')
    frames.append(image)
frames[0].save(folder / 'motion.gif', save_all=True, append_images=frames[1:], duration=200, loop=0)
print(folder)
