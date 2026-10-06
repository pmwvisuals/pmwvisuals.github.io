"""Measure existing local WebP previews; never alter or download images.

The palette is descriptive evidence from the preview, not an assessment of the
original artwork or a claimed display/battery measurement.
"""
import colorsys
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]

def color_name(rgb):
    h, s, v = colorsys.rgb_to_hsv(*(n / 255 for n in rgb))
    if v < .13:
        return 'Near black'
    if s < .18:
        return 'Charcoal' if v < .4 else 'Gray' if v < .75 else 'Pale gray'
    hue = h * 360
    name = ('Red' if hue < 15 or hue >= 345 else 'Orange' if hue < 40 else
            'Gold' if hue < 65 else 'Green' if hue < 165 else 'Teal' if hue < 195 else
            'Blue' if hue < 255 else 'Violet' if hue < 290 else 'Rose')
    return ('Deep ' if v < .45 else '') + name.lower()

result = {}
for file in sorted((ROOT / 'thumbnails/google-drive').glob('*.webp')):
    with Image.open(file) as source:
        image = source.convert('RGB')
        # Analysis only. The source file remains unchanged.
        sample = image.resize((64, 64))
        quantized = sample.quantize(colors=8)
        palette = quantized.getpalette()
        colors = []
        names = set()
        for count, index in sorted(quantized.getcolors(), reverse=True):
            rgb = palette[index * 3:index * 3 + 3]
            name = color_name(rgb)
            if name in names:
                continue
            names.add(name)
            colors.append({'name': name, 'hex': '#' + ''.join(f'{n:02x}' for n in rgb)})
            if len(colors) == 3:
                break
        dark = sum(max(pixel) < 55 for pixel in sample.getdata()) / 4096
        result['/thumbnails/google-drive/' + file.name] = {
            'width': source.width, 'height': source.height,
            'format': 'image/webp', 'palette': colors, 'darkFraction': round(dark, 3)
        }

target = Path(__file__).with_name('preview-analysis.json')
target.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print(f'Measured {len(result)} existing previews; image files unchanged.')
