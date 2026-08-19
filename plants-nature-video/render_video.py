#!/usr/bin/env python3
"""Render a 30-minute animated Plants & Nature episode to MP4."""
from __future__ import annotations

import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 720
FPS = 12
DURATION = 1800
ROOT = Path(__file__).resolve().parent
OUT = ROOT / "out" / "plants-nature-30min.mp4"
OUT.parent.mkdir(exist_ok=True)

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT2 = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(FONT if bold else FONT2, size)
    except OSError:
        return ImageFont.load_default()


F64 = font(54)
F42 = font(36)
F28 = font(24)
F22 = font(20)
F18 = font(16)


def lerp(a, b, t):
    t = max(0.0, min(1.0, t))
    return a + (b - a) * t


def scene_of(t: float) -> int:
    bounds = [
        30, 90, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840, 900,
        960, 1020, 1080, 1140, 1200, 1260, 1320, 1380, 1440, 1500, 1560, 1620,
        1650, 1680, 1710, 1755, 1800,
    ]
    for i, b in enumerate(bounds, start=1):
        if t < b:
            return i
    return 32


_SKY = None
_GRASS = None
_SUNSET = None


def _vert_grad(h, top, bot):
    img = Image.new("RGB", (1, h))
    px = img.load()
    for y in range(h):
        p = y / max(h - 1, 1)
        px[0, y] = (
            int(lerp(top[0], bot[0], p)),
            int(lerp(top[1], bot[1], p)),
            int(lerp(top[2], bot[2], p)),
        )
    return img.resize((W, h))


def draw_sky(d: ImageDraw.ImageDraw, img: Image.Image, t: float) -> None:
    global _SKY, _GRASS
    if _SKY is None:
        _SKY = _vert_grad(420, (135, 206, 235), (186, 230, 253))
        _GRASS = Image.new("RGB", (W, H - 420), (107, 203, 99))
        g = ImageDraw.Draw(_GRASS)
        g.rectangle([0, 140, W, H - 420], fill=(139, 184, 86))
    if t > 1755:
        k = (t - 1755) / 45
        top = (int(lerp(135, 255, k)), int(lerp(206, 140, k)), int(lerp(235, 80, k)))
        bot = (int(lerp(186, 255, k)), int(lerp(230, 180, k)), int(lerp(253, 100, k)))
        sky = _vert_grad(420, top, bot)
        img.paste(sky, (0, 0))
    else:
        img.paste(_SKY, (0, 0))
    img.paste(_GRASS, (0, 420))


def draw_sun(d: ImageDraw.ImageDraw, t: float) -> None:
    # rises in scene 4 (180-240)
    if t < 180:
        y = 90
    elif t < 210:
        y = int(lerp(160, 70, (t - 180) / 30))
    else:
        y = 70
        if t > 1755:
            y = int(lerp(70, 200, (t - 1755) / 45))
    x = 1080
    d.ellipse([x - 48, y - 48, x + 48, y + 48], fill=(255, 217, 61))
    for i in range(10):
        ang = i / 10 * math.tau + t * 0.15
        x1 = x + math.cos(ang) * 58
        y1 = y + math.sin(ang) * 58
        x2 = x + math.cos(ang) * 78
        y2 = y + math.sin(ang) * 78
        d.line([(x1, y1), (x2, y2)], fill=(255, 200, 40), width=4)


def draw_cloud(d: ImageDraw.ImageDraw, x: int, y: int) -> None:
    d.ellipse([x, y, x + 90, y + 42], fill="white")
    d.ellipse([x + 30, y - 16, x + 88, y + 30], fill="white")
    d.ellipse([x + 55, y, x + 120, y + 40], fill="white")


def draw_tree(d: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    tw, th = int(36 * scale), int(140 * scale)
    d.rectangle([x, y, x + tw, y + th], fill=(121, 72, 38))
    r = int(90 * scale)
    d.ellipse([x + tw // 2 - r, y - r * 2, x + tw // 2 + r, y + 20], fill=(46, 139, 70))
    d.ellipse([x + tw // 2 - r + 30, y - r * 2 - 20, x + tw // 2 + r + 20, y], fill=(60, 179, 87))


def draw_flower(d: ImageDraw.ImageDraw, x: int, y: int, color, sway: float) -> None:
    x2 = x + int(math.sin(sway) * 6)
    d.line([(x, y + 40), (x2, y)], fill=(46, 139, 70), width=4)
    for i in range(5):
        ang = i / 5 * math.tau
        px = x2 + math.cos(ang) * 12
        py = y + math.sin(ang) * 12
        d.ellipse([px - 8, py - 8, px + 8, py + 8], fill=color)
    d.ellipse([x2 - 7, y - 7, x2 + 7, y + 7], fill=(255, 221, 80))


def draw_bush(d: ImageDraw.ImageDraw, x: int, y: int) -> None:
    d.ellipse([x, y, x + 90, y + 50], fill=(56, 161, 80))
    d.ellipse([x + 30, y - 16, x + 110, y + 40], fill=(46, 139, 70))


def draw_carrot(d: ImageDraw.ImageDraw, x: int, y: int) -> None:
    d.polygon([(x, y), (x + 18, y), (x + 9, y + 46)], fill=(255, 140, 40))
    d.polygon([(x + 4, y), (x + 9, y - 18), (x + 14, y)], fill=(46, 160, 70))


def draw_milo(d: ImageDraw.ImageDraw, x: int, y: int, t: float, pose: str) -> None:
    walk = math.sin(t * 8) * 6 if pose == "walk" else 0
    bob = math.sin(t * 3) * 3
    y = y + int(bob)
    # legs
    d.rectangle([x + 18, y + 88, x + 32, y + 128 + int(walk)], fill=(47, 90, 180))
    d.rectangle([x + 40, y + 88, x + 54, y + 128 - int(walk)], fill=(47, 90, 180))
    d.ellipse([x + 12, y + 122, x + 36, y + 138], fill=(232, 176, 56))
    d.ellipse([x + 38, y + 122, x + 62, y + 138], fill=(232, 176, 56))
    # body
    d.ellipse([x + 10, y + 38, x + 64, y + 100], fill=(78, 205, 196))
    # backpack
    d.rounded_rectangle([x + 2, y + 48, x + 22, y + 88], radius=8, fill=(255, 107, 107))
    # head
    d.ellipse([x + 8, y - 8, x + 68, y + 52], fill=(255, 224, 176))
    d.ellipse([x + 14, y - 18, x + 30, y + 2], fill=(78, 205, 196))
    d.ellipse([x + 46, y - 18, x + 62, y + 2], fill=(78, 205, 196))
    # eyes
    blink = 1 if int(t * 2) % 17 == 0 else 0
    if blink:
        d.line([(x + 24, y + 18), (x + 32, y + 18)], fill=(40, 30, 20), width=3)
        d.line([(x + 42, y + 18), (x + 50, y + 18)], fill=(40, 30, 20), width=3)
    else:
        d.ellipse([x + 24, y + 12, x + 34, y + 26], fill=(40, 30, 20))
        d.ellipse([x + 42, y + 12, x + 52, y + 26], fill=(40, 30, 20))
        d.ellipse([x + 26, y + 14, x + 30, y + 18], fill="white")
        d.ellipse([x + 44, y + 14, x + 48, y + 18], fill="white")
    d.ellipse([x + 18, y + 28, x + 28, y + 36], fill=(255, 154, 168))
    d.ellipse([x + 48, y + 28, x + 58, y + 36], fill=(255, 154, 168))
    d.arc([x + 28, y + 28, x + 48, y + 44], 20, 160, fill=(40, 30, 20), width=3)
    # arms
    if pose == "wave":
        ang = -40 + math.sin(t * 10) * 35
        ax = x + 62 + int(math.cos(math.radians(ang)) * 28)
        ay = y + 50 + int(math.sin(math.radians(ang)) * 28)
        d.line([(x + 58, y + 58), (ax, ay)], fill=(255, 224, 176), width=10)
        d.ellipse([ax - 8, ay - 8, ax + 8, ay + 8], fill=(255, 224, 176))
        d.line([(x + 16, y + 58), (x + 4, y + 86)], fill=(255, 224, 176), width=10)
    elif pose == "point":
        d.line([(x + 58, y + 58), (x + 96, y + 28)], fill=(255, 224, 176), width=10)
        d.line([(x + 16, y + 58), (x + 4, y + 86)], fill=(255, 224, 176), width=10)
    elif pose == "water":
        d.line([(x + 58, y + 50), (x + 92, y + 36)], fill=(255, 224, 176), width=10)
        d.polygon([(x + 88, y + 20), (x + 112, y + 28), (x + 92, y + 44)], fill=(70, 130, 220))
        d.line([(x + 16, y + 58), (x + 4, y + 86)], fill=(255, 224, 176), width=10)
    elif pose == "hold":
        d.line([(x + 58, y + 58), (x + 86, y + 70)], fill=(255, 224, 176), width=10)
        d.ellipse([x + 80, y + 66, x + 98, y + 84], fill=(139, 90, 43))
        d.line([(x + 16, y + 58), (x + 4, y + 86)], fill=(255, 224, 176), width=10)
    elif pose == "sit":
        d.ellipse([x + 10, y + 70, x + 70, y + 110], fill=(78, 205, 196))
    else:
        d.line([(x + 16, y + 58), (x + 4, y + 90)], fill=(255, 224, 176), width=10)
        d.line([(x + 58, y + 58), (x + 72, y + 90)], fill=(255, 224, 176), width=10)


def draw_bee(d: ImageDraw.ImageDraw, t: float) -> None:
    x = 700 + int(math.sin(t * 1.3) * 180)
    y = 210 + int(math.cos(t * 1.7) * 40)
    d.ellipse([x, y, x + 28, y + 18], fill=(255, 204, 0))
    d.ellipse([x + 8, y - 10, x + 22, y + 6], fill=(220, 240, 255))
    d.rectangle([x + 8, y + 4, x + 12, y + 14], fill=(40, 30, 20))
    d.rectangle([x + 16, y + 4, x + 20, y + 14], fill=(40, 30, 20))


def draw_butterfly(d: ImageDraw.ImageDraw, t: float, ox: int, oy: int, color) -> None:
    x = ox + int(math.sin(t * 1.1 + ox) * 90)
    y = oy + int(math.cos(t * 0.9 + oy) * 30)
    flap = 10 + int(abs(math.sin(t * 8)) * 12)
    d.ellipse([x - flap, y, x, y + 18], fill=color)
    d.ellipse([x, y, x + flap, y + 18], fill=color)
    d.rectangle([x - 2, y + 2, x + 2, y + 16], fill=(40, 30, 20))


def draw_label(d: ImageDraw.ImageDraw, text: str, y: int = 24) -> None:
    bbox = d.textbbox((0, 0), text, font=F42)
    tw = bbox[2] - bbox[0]
    x = (W - tw) // 2
    d.rounded_rectangle([x - 22, y - 8, x + tw + 22, y + 52], radius=18, fill=(255, 255, 255))
    d.rounded_rectangle([x - 18, y - 4, x + tw + 18, y + 48], radius=16, fill=(46, 139, 87))
    d.text((x, y), text, font=F42, fill="white")


def draw_plant_diagram(d: ImageDraw.ImageDraw, t: float, s: int) -> None:
    cx, base = 640, 430
    # soil
    d.rectangle([420, 430, 860, 620], fill=(166, 124, 72))
    if s >= 3:
        # roots
        glow = 180 + int((math.sin(t * 3) * 0.5 + 0.5) * 75)
        root_col = (120, 80, 40) if t < 110 else (glow, 90, 40)
        for dx, dy in [(-20, 40), (0, 55), (24, 38), (-36, 28)]:
            d.line([(cx, base), (cx + dx, base + dy)], fill=root_col, width=6)
    stem_h = 20
    if t >= 128:
        stem_h = 110
    elif t >= 90:
        stem_h = 60
    d.rectangle([cx - 8, base - stem_h, cx + 8, base], fill=(46, 160, 70))
    if t >= 146:
        d.ellipse([cx - 70, base - stem_h - 20, cx - 10, base - stem_h + 30], fill=(56, 176, 80))
        d.ellipse([cx + 10, base - stem_h - 20, cx + 70, base - stem_h + 30], fill=(56, 176, 80))
        d.ellipse([cx - 18, base - stem_h - 40, cx + 18, base - stem_h - 8], fill=(80, 200, 90))


def draw_growth(d: ImageDraw.ImageDraw, t: float) -> None:
    # seed to plant 480-720
    cx, soil = 640, 500
    d.rectangle([0, soil, W, H], fill=(166, 124, 72))
    d.rectangle([0, 0, W, soil], fill=(186, 230, 253))
    age = 0.0
    if t >= 480:
        age = min(1.0, (t - 480) / 220)
    if t < 494:
        d.ellipse([cx - 16, soil + 30, cx + 16, soil + 62], fill=(139, 90, 43))
        return
    # roots
    d.line([(cx, soil + 20), (cx - 20, soil + 70)], fill=(121, 72, 38), width=4)
    d.line([(cx, soil + 20), (cx + 18, soil + 66)], fill=(121, 72, 38), width=4)
    shoot = int(age * 160)
    d.rectangle([cx - 6, soil - shoot, cx + 6, soil + 20], fill=(80, 180, 70))
    if age > 0.35:
        d.ellipse([cx - 40, soil - shoot - 10, cx - 4, soil - shoot + 24], fill=(70, 190, 80))
        d.ellipse([cx + 4, soil - shoot - 10, cx + 40, soil - shoot + 24], fill=(70, 190, 80))
    if age > 0.7:
        d.ellipse([cx - 18, soil - shoot - 36, cx + 18, soil - shoot - 4], fill=(255, 120, 160))


def banner(d: ImageDraw.ImageDraw, lines: list[str]) -> None:
    d.rounded_rectangle([80, 80, 1200, 200], radius=24, fill=(255, 255, 255))
    y = 100
    for line in lines:
        d.text((110, y), line, font=F42, fill=(34, 90, 50))
        y += 44


def milo_pose(t: float) -> str:
    s = scene_of(t)
    if s == 1 and t < 8:
        return "walk"
    if s == 1 and t < 21:
        return "wave"
    if s in (2, 14, 19, 22):
        return "point"
    if s == 5:
        return "water"
    if s in (7, 8):
        return "hold"
    if s == 21:
        return "sit"
    if s == 32:
        return "wave"
    if s == 26:
        return "walk"
    return "idle"


def milo_x(t: float) -> int:
    if t < 8:
        return int(lerp(-90, 220, t / 8))
    if scene_of(t) == 26:
        return 220 + int(math.sin((t - 1500) * 0.4) * 80)
    if scene_of(t) == 32:
        return 520 + int(math.sin(t) * 20)
    return 220


def frame_image(t: float) -> Image.Image:
    img = Image.new("RGB", (W, H), (135, 206, 235))
    d = ImageDraw.Draw(img)
    s = scene_of(t)

    if s in (6, 9) or (480 <= t < 540):
        # underground-ish
        if s == 6 or (300 <= t < 360):
            d.rectangle([0, 0, W, 180], fill=(135, 206, 235))
            d.rectangle([0, 180, W, H], fill=(166, 124, 72))
            draw_sun(d, t)
            draw_label(d, "SOIL  +  WATER  +  ROOTS")
            # particles
            for i in range(18):
                px = 80 + i * 64
                py = 280 + int(math.sin(t * 2 + i) * 10)
                d.ellipse([px, py, px + 14, py + 10], fill=(196, 154, 92))
            draw_milo(d, 80, 80, t, "point")
            return img
        draw_growth(d, t)
        draw_milo(d, 80, 40, t, milo_pose(t))
        draw_label(d, "LOOK! IT'S GROWING!" if t >= 522 else "UNDERGROUND")
        return img

    if s == 3:
        draw_sky(d, img, t)
        draw_plant_diagram(d, t, s)
        draw_milo(d, 90, 430, t, "point")
        title = "WHAT IS A PLANT?"
        if t >= 146:
            title = "LEAVES MAKE FOOD"
        elif t >= 128:
            title = "STEM"
        elif t >= 110:
            title = "ROOTS"
        draw_label(d, title)
        return img

    draw_sky(d, img, t)
    draw_sun(d, t)
    draw_cloud(d, int(80 + (t * 8) % 400), 70)
    draw_cloud(d, int(500 + (t * 5) % 300), 110)

    # garden props by time
    if t >= 40 or s >= 2:
        draw_tree(d, 860, 300, 1.15)
    else:
        draw_tree(d, 860, 300, 1.0)
    if t >= 40:
        d.text((870, 250), "TREE", font=F18, fill=(20, 70, 30))
    sway = t * 1.4
    if t >= 48 or s >= 2:
        cols = [(255, 99, 132), (255, 183, 3), (116, 90, 242), (6, 214, 160)]
        for i, col in enumerate(cols):
            draw_flower(d, 430 + i * 70, 470, col, sway + i)
    draw_bush(d, 80, 470)
    draw_bush(d, 1120, 480)
    if t >= 56:
        draw_carrot(d, 360, 520)
        d.text((330, 570), "VEGETABLE", font=F18, fill=(90, 50, 10))

    if s in (16, 17, 18, 30, 32):
        draw_bee(d, t)
    if s in (1, 2, 17, 18, 30, 32):
        draw_butterfly(d, t, 600, 240, (255, 105, 180))
        draw_butterfly(d, t * 0.9, 760, 200, (90, 80, 255))

    if s == 13:
        for i, col in enumerate([(255, 80, 120), (255, 200, 40), (180, 80, 255), (80, 200, 255)]):
            draw_flower(d, 480 + i * 90, 380, col, t * 2 + i)

    if s == 14:
        # fruits
        d.ellipse([980, 250, 1010, 280], fill=(220, 40, 40))
        d.ellipse([1018, 240, 1050, 272], fill=(220, 40, 40))
        d.ellipse([500, 500, 540, 534], fill=(255, 60, 80))
        d.ellipse([560, 508, 590, 536], fill=(230, 40, 40))

    if s == 19:
        draw_tree(d, 520, 220, 1.8)
        d.ellipse([610, 200, 640, 220], fill=(255, 230, 80))  # nest

    if s == 21:
        draw_tree(d, 500, 210, 1.7)

    if s == 22:
        fruits = [(255, 50, 50), (255, 220, 40), (255, 140, 0), (255, 70, 100)]
        for i, col in enumerate(fruits):
            d.ellipse([420 + i * 90, 360, 470 + i * 90, 410], fill=col)

    if s == 23:
        draw_carrot(d, 520, 430)
        d.ellipse([620, 400, 660, 440], fill=(230, 50, 50))
        d.ellipse([700, 390, 760, 430], fill=(90, 190, 70))

    if s == 26:
        d.rounded_rectangle([600, 500, 640, 530], radius=6, fill=(80, 80, 90))
        d.rounded_rectangle([900, 480, 960, 560], radius=10, fill=(46, 180, 90))

    if s == 28:
        banner(d, ["A  Sunlight    B  Water", "C  Soil        D  All of these!"])
    if s == 29:
        banner(d, ["Flower    ROOTS    Fruit"])
    if s == 30:
        banner(d, ["Bees and butterflies!"])

    pose = milo_pose(t)
    mx = milo_x(t)
    my = 430 if pose != "sit" else 470
    if s == 19:
        mx, my = 300, 430
    draw_milo(d, mx, my, t, pose)

    # titles / labels
    labels = {
        1: "PLANTS & NATURE",
        2: "PLANTS ARE ALL AROUND US",
        4: "SUNLIGHT",
        5: "WATER",
        10: "SPROUT",
        12: "SUN + WATER + SOIL = PLANT",
        13: "FLOWER",
        15: "SEED  ->  PLANT  ->  SEED",
        16: "BEES",
        17: "BEES  &  BUTTERFLIES",
        18: "NATURE WORKS LIKE A TEAM",
        20: "TREES HELP OUR AIR",
        24: "PLANTS ARE USEFUL",
        25: "BE GENTLE WITH NATURE",
        26: "KEEP NATURE CLEAN",
        27: "CARE FOR NATURE",
        31: "LET'S REMEMBER",
        32: "KEEP EXPLORING!  LOVE NATURE!",
    }
    if s == 1 and t > 6:
        draw_label(d, labels[1])
    elif s in labels and s != 1:
        draw_label(d, labels[s])

    # lower caption strip
    d.rectangle([0, 670, W, H], fill=(20, 60, 40))
    d.text((24, 682), "Milo's Garden  •  Plants & Nature  •  30 minute episode", font=F18, fill="white")
    return img


def main() -> None:
    total = int(DURATION * FPS)
    cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
        "-i", "-",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", "23",
        "-movflags", "+faststart",
        str(OUT),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    assert proc.stdin is not None
    for i in range(total):
        t = i / FPS
        img = frame_image(t)
        proc.stdin.write(img.tobytes())
        if i % (FPS * 30) == 0:
            print(f"render {int(t)}s / {DURATION}s", flush=True)
    proc.stdin.close()
    proc.wait()
    print("video", OUT, "size", OUT.stat().st_size)


if __name__ == "__main__":
    main()
