# Generates the synthetic sample evidence images used by the demo seed.
# Illustrations only: no real photographs, no real places. Each image carries a "Sample evidence" label.
import os
import shutil
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "evidence")
SCENES = [
    ("flood", (196, 221, 235)),
    ("fire", (240, 214, 190)),
    ("landslide", (219, 210, 190)),
    ("road", (214, 226, 214)),
    ("shelter", (226, 220, 236)),
    ("debris", (232, 228, 214)),
]

def draw_scene(d, kind, w, h):
    if kind == "flood":
        d.rectangle([0, h * 0.55, w, h], fill=(120, 165, 196))
        for y in range(int(h * 0.6), h, 26):
            d.line([(20, y), (w - 20, y + 4)], fill=(170, 200, 220), width=3)
        d.polygon([(w * 0.2, h * 0.55), (w * 0.4, h * 0.2), (w * 0.6, h * 0.55)], fill=(150, 130, 110))
    elif kind == "fire":
        d.rectangle([w * 0.2, h * 0.5, w * 0.8, h * 0.85], fill=(150, 120, 100))
        for i in range(5):
            x = w * (0.3 + i * 0.1)
            d.ellipse([x - 28, h * 0.22 + (i % 2) * 20, x + 28, h * 0.42], fill=(170, 170, 170))
    elif kind == "landslide":
        d.polygon([(0, h * 0.4), (w * 0.5, h * 0.25), (w, h * 0.45), (w, h), (0, h)], fill=(140, 110, 80))
        for i in range(8):
            x = 40 + i * (w - 80) / 7
            d.ellipse([x - 14, h * 0.62 + (i % 3) * 18, x + 14, h * 0.7 + (i % 3) * 18], fill=(90, 70, 50))
    elif kind == "road":
        d.polygon([(w * 0.35, h), (w * 0.45, h * 0.45), (w * 0.55, h * 0.45), (w * 0.65, h)], fill=(90, 90, 96))
        for y in range(int(h * 0.5), h, 40):
            d.rectangle([w * 0.5 - 4, y, w * 0.5 + 4, y + 18], fill=(230, 230, 230))
    elif kind == "shelter":
        d.polygon([(w * 0.25, h * 0.5), (w * 0.5, h * 0.28), (w * 0.75, h * 0.5)], fill=(120, 140, 170))
        d.rectangle([w * 0.3, h * 0.5, w * 0.7, h * 0.8], fill=(170, 190, 210))
        for i in range(3):
            d.ellipse([w * 0.36 + i * 40, h * 0.6, w * 0.36 + i * 40 + 22, h * 0.68], fill=(70, 90, 120))
    else:
        for i in range(7):
            x = 60 + (i * 97) % (w - 120)
            y = h * 0.55 + (i * 53) % int(h * 0.3)
            d.rectangle([x, y, x + 60, y + 26], fill=(150, 130, 105))
        d.line([(0, h * 0.5), (w, h * 0.42)], fill=(90, 110, 80), width=10)

def main():
    os.makedirs(OUT, exist_ok=True)
    font = ImageFont.load_default(size=26)
    small = ImageFont.load_default(size=18)
    w, h = 640, 480
    for i, (kind, bg) in enumerate(SCENES, start=1):
        img = Image.new("RGB", (w, h), bg)
        d = ImageDraw.Draw(img)
        draw_scene(d, kind, w, h)
        d.rectangle([0, 0, w, 52], fill=(40, 40, 60))
        d.text((16, 12), "Sample evidence", font=font, fill=(255, 255, 255))
        d.rectangle([0, h - 40, w, h], fill=(40, 40, 60))
        d.text((16, h - 32), f"Fictional demo illustration · {kind}", font=small, fill=(230, 230, 240))
        path = os.path.join(OUT, f"sample-{i:02d}.png")
        img.save(path, format="PNG", optimize=True)
        print(path, os.path.getsize(path))

# Copies the generated images into the web asset folder. The mobile app uploads evidence but never displays it, so it needs no copy.
TARGETS = [
    os.path.join(os.path.dirname(OUT), "..", "web", "public", "demo-evidence"),
]

def sync():
    for target in TARGETS:
        target = os.path.normpath(target)
        os.makedirs(target, exist_ok=True)
        for name in sorted(os.listdir(OUT)):
            if name.endswith(".png"):
                shutil.copyfile(os.path.join(OUT, name), os.path.join(target, name))
        print("synced", target)

if __name__ == "__main__":
    main()
    sync()
