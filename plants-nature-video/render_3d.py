#!/usr/bin/env python3
"""30-minute silent 3D Plants & Nature episode."""
from __future__ import annotations

import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 720
FPS = 12
DURATION = 1800
ROOT = Path(__file__).resolve().parent
OUT = ROOT / "out" / "plants-nature-3d-silent.mp4"
OUT.parent.mkdir(exist_ok=True)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size: int):
    try:
        return ImageFont.truetype(FONT, size)
    except OSError:
        return ImageFont.load_default()


F40 = font(34)
F18 = font(18)


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


def make_sphere(r: int, rgb, light=(-0.35, -0.48, 0.82)) -> Image.Image:
    """Shaded 3D sphere sprite (vectorized)."""
    r = int(max(6, min(r, 48)))
    y, x = np.mgrid[-r : r + 1, -r : r + 1]
    nx = x / r
    ny = y / r
    d2 = nx * nx + ny * ny
    nz = np.sqrt(np.clip(1.0 - d2, 0, 1))
    lx, ly, lz = light
    ln = math.sqrt(lx * lx + ly * ly + lz * lz)
    lx, ly, lz = lx / ln, ly / ln, lz / ln
    diff = np.clip(nx * lx + ny * ly + nz * lz, 0, 1)
    spec = diff ** 10
    s = np.clip(0.42 + 0.72 * diff, 0, 1)
    cr, cg, cb = [c / 255.0 for c in rgb]
    rr = np.clip((cr * s + 0.45 * spec) * 255, 0, 255).astype(np.uint8)
    gg = np.clip((cg * s + 0.45 * spec) * 255, 0, 255).astype(np.uint8)
    bb = np.clip((cb * s + 0.45 * spec) * 255, 0, 255).astype(np.uint8)
    a = np.where(d2 < 0.97, 255, 0).astype(np.uint8)
    a = np.where(d2 >= 1.0, 0, a)
    arr = np.dstack([rr, gg, bb, a])
    return Image.fromarray(arr, "RGBA")


SPHERES: dict[tuple, Image.Image] = {}


def ball(rgb, r: int) -> Image.Image:
    key = (rgb, r)
    if key not in SPHERES:
        SPHERES[key] = make_sphere(max(4, r), rgb)
    return SPHERES[key]


class Cam:
    def __init__(self, eye, look, fov=55):
        self.eye = np.array(eye, dtype=float)
        self.look = np.array(look, dtype=float)
        self.fov = fov

    def project(self, p):
        f = (np.array(p) - self.eye).astype(float)
        forward = self.look - self.eye
        forward = forward / (np.linalg.norm(forward) + 1e-8)
        world_up = np.array([0.0, 1.0, 0.0])
        right = np.cross(forward, world_up)
        right = right / (np.linalg.norm(right) + 1e-8)
        up = np.cross(right, forward)
        x = float(np.dot(f, right))
        y = float(np.dot(f, up))
        z = float(np.dot(f, forward))
        if z < 0.85:
            return None
        fl = (H * 0.5) / math.tan(math.radians(self.fov) * 0.5)
        sx = W * 0.5 + x * fl / z
        sy = H * 0.48 - y * fl / z
        scale = min(220.0, fl / z)
        return sx, sy, z, scale


def blit(dst: Image.Image, sprite: Image.Image, cx: float, cy: float, radius: float):
    if radius < 2:
        return
    size = int(max(4, min(radius * 2, 180)))
    sp = sprite.resize((size, size), Image.BILINEAR)
    x = int(cx - size / 2)
    y = int(cy - size / 2)
    if x >= W or y >= H or x + size <= 0 or y + size <= 0:
        return
    dst.alpha_composite(sp, (x, y))


_DAY_BG = None


def ground_bg(t: float) -> Image.Image:
    global _DAY_BG
    sunset = t > 1755
    if not sunset and _DAY_BG is not None:
        return _DAY_BG.copy()
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if sunset:
        k = (t - 1755) / 45
        top = (int(lerp(110, 255, k)), int(lerp(175, 140, k)), int(lerp(235, 80, k)))
        bot = (int(lerp(200, 255, k)), int(lerp(230, 185, k)), int(lerp(255, 120, k)))
    else:
        top, bot = (120, 190, 245), (225, 242, 255)
    sky = Image.new("RGB", (1, 360))
    px = sky.load()
    for y in range(360):
        p = y / 359
        px[0, y] = (
            int(lerp(top[0], bot[0], p)),
            int(lerp(top[1], bot[1], p)),
            int(lerp(top[2], bot[2], p)),
        )
    img.paste(sky.resize((W, 360)))
    d.polygon([(0, 330), (W, 330), (W, H), (0, H)], fill=(118, 198, 92, 255))
    d.polygon([(0, 510), (W, 510), (W, H), (0, H)], fill=(98, 176, 78, 255))
    for i in range(1, 8):
        y = 340 + int((i / 8) ** 1.35 * 360)
        d.line([(0, y), (W, y)], fill=(140, 210, 130, 70), width=2)
    if not sunset:
        _DAY_BG = img.copy()
    return img


def add_shadow(dst: Image.Image, sx, sy, scale, mul=1.0):
    rw = int(max(8, min(28 * scale * mul, 90)))
    rh = int(max(4, min(10 * scale * mul, 36)))
    shadow = Image.new("RGBA", (rw * 2, rh * 2), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse([0, 0, rw * 2 - 1, rh * 2 - 1], fill=(0, 0, 0, 55))
    dst.alpha_composite(shadow, (int(sx - rw), int(sy - rh * 0.2)))


def draw_milo_3d(layer: Image.Image, cam: Cam, pos, t, pose: str):
    x, y, z = pos
    bob = math.sin(t * 3.2) * 0.04
    walk = math.sin(t * 7) * 0.12 if pose == "walk" else 0
    parts = []
    # feet, legs, body, pack, head, ears, arms
    parts.append(((x - 0.12, y + 0.02, z + 0.08 + walk), (232, 176, 56), 0.11))
    parts.append(((x + 0.12, y + 0.02, z - 0.02 - walk), (232, 176, 56), 0.11))
    parts.append(((x - 0.10, y + 0.22, z + 0.06), (50, 90, 190), 0.10))
    parts.append(((x + 0.10, y + 0.22, z - 0.02), (50, 90, 190), 0.10))
    parts.append(((x, y + 0.52, z), (70, 210, 200), 0.28))
    parts.append(((x - 0.22, y + 0.55, z - 0.05), (255, 90, 95), 0.14))
    parts.append(((x, y + 0.95 + bob, z), (255, 220, 175), 0.24))
    parts.append(((x - 0.16, y + 1.14 + bob, z), (70, 210, 200), 0.09))
    parts.append(((x + 0.16, y + 1.14 + bob, z), (70, 210, 200), 0.09))
    if pose == "wave":
        ang = -0.7 + math.sin(t * 10) * 0.55
        parts.append(((x + 0.38, y + 0.72 + math.sin(ang) * 0.22, z + 0.1), (255, 220, 175), 0.09))
        parts.append(((x + 0.52, y + 0.95 + math.cos(ang) * 0.18, z + 0.12), (255, 220, 175), 0.10))
    elif pose == "point":
        parts.append(((x + 0.42, y + 0.78, z + 0.18), (255, 220, 175), 0.09))
        parts.append(((x + 0.62, y + 0.92, z + 0.28), (255, 220, 175), 0.10))
    elif pose == "hold":
        parts.append(((x + 0.38, y + 0.55, z + 0.16), (255, 220, 175), 0.09))
        parts.append(((x + 0.48, y + 0.42, z + 0.18), (150, 95, 45), 0.10))
    elif pose == "water":
        parts.append(((x + 0.40, y + 0.70, z + 0.16), (255, 220, 175), 0.09))
        parts.append(((x + 0.58, y + 0.82, z + 0.2), (70, 140, 230), 0.11))
    else:
        parts.append(((x - 0.32, y + 0.48, z + 0.04), (255, 220, 175), 0.08))
        parts.append(((x + 0.32, y + 0.48, z + 0.04), (255, 220, 175), 0.08))

    projected = []
    for p, col, rad in parts:
        pr = cam.project(p)
        if not pr:
            continue
        sx, sy, depth, scale = pr
        projected.append((depth, sx, sy, scale, col, rad))
    projected.sort(key=lambda q: -q[0])
    # shadow
    g = cam.project((x, 0.02, z))
    if g:
        add_shadow(layer, g[0], g[1], g[3], 1.6)
    for _depth, sx, sy, scale, col, rad in projected:
        blit(layer, ball(col, 28), sx, sy, rad * scale)


def draw_tree_3d(layer, cam, pos, scale=1.0):
    x, y, z = pos
    trunk = []
    for i in range(5):
        trunk.append(((x, 0.25 + i * 0.28 * scale, z), (118, 72, 36), 0.14 * scale))
    canopy = [
        ((x, 1.7 * scale, z), (46, 150, 70), 0.72 * scale),
        ((x + 0.35 * scale, 1.85 * scale, z + 0.1), (56, 170, 80), 0.48 * scale),
        ((x - 0.3 * scale, 1.9 * scale, z - 0.12), (40, 140, 62), 0.42 * scale),
    ]
    items = []
    for p, c, r in trunk + canopy:
        pr = cam.project(p)
        if pr:
            items.append((pr[2], pr[0], pr[1], pr[3], c, r))
    g = cam.project((x, 0.02, z))
    if g:
        add_shadow(layer, g[0], g[1], g[3], 2.2 * scale)
    items.sort(key=lambda q: -q[0])
    for _d, sx, sy, sc, c, r in items:
        blit(layer, ball(c, 32), sx, sy, r * sc)


def draw_flower_3d(layer, cam, pos, color, sway):
    x, y, z = pos
    x2 = x + math.sin(sway) * 0.05
    stem = cam.project((x2, 0.22, z))
    head = cam.project((x2, 0.48, z))
    if stem:
        add_shadow(layer, stem[0], stem[1], stem[3], 0.5)
    if head:
        blit(layer, ball((50, 150, 70), 16), head[0], head[1] + head[3] * 0.18, 0.08 * head[3])
        blit(layer, ball(color, 20), head[0], head[1], 0.13 * head[3])
        blit(layer, ball((255, 220, 70), 12), head[0], head[1], 0.06 * head[3])


def draw_sun_3d(layer, cam, t):
    y = 3.4 if t < 180 else lerp(2.4, 3.6, min(1, (t - 180) / 40))
    if t > 1755:
        y = lerp(3.6, 1.6, (t - 1755) / 45)
    pr = cam.project((4.2, y, 8.5))
    if pr:
        blit(layer, ball((255, 220, 70), 40), pr[0], pr[1], 0.55 * pr[3])


def pose_at(t):
    s = scene_of(t)
    if s == 1 and t < 8:
        return "walk"
    if s == 1:
        return "wave"
    if s in (2, 4, 12, 14, 19, 22, 28, 29, 30):
        return "point"
    if s == 5:
        return "water"
    if s in (7, 8):
        return "hold"
    if s == 32:
        return "wave"
    return "idle"


def milo_pos(t):
    if t < 8:
        return (lerp(-2.6, -0.8, t / 8), 0.0, 2.2)
    s = scene_of(t)
    if s == 32:
        return (0.2 + math.sin(t) * 0.15, 0.0, 2.0)
    if s == 26:
        return (-0.4 + math.sin((t - 1500) * 0.5) * 0.7, 0.0, 2.1)
    if s == 19:
        return (-1.4, 0.0, 2.4)
    return (-0.85, 0.0, 2.15)


def cam_for(t) -> Cam:
    s = scene_of(t)
    orbit = math.sin(t * 0.05) * 0.35
    if s in (6, 9) or (480 <= t < 540):
        return Cam((0.2, 0.7, -1.2), (0.0, 0.4, 2.2), 60)
    if s == 3:
        return Cam((0.1, 1.1, -1.4), (0.2, 0.7, 2.0), 52)
    if s == 4:
        return Cam((0.4 + orbit, 1.4, -2.0), (0.6, 1.2, 4.0), 55)
    if s == 19:
        return Cam((-0.2, 1.6, -2.4), (1.2, 1.4, 3.2), 50)
    if t > 1755:
        return Cam((0.0, 1.8 + (t - 1755) * 0.03, -3.0 - (t - 1755) * 0.04), (0.3, 0.8, 3.0), 52)
    return Cam((0.2 + orbit, 1.45, -3.1), (0.15, 0.55, 3.4), 50)


LABELS = {
    1: "PLANTS & NATURE",
    2: "PLANTS ARE ALL AROUND US",
    3: "WHAT IS A PLANT?",
    4: "SUNLIGHT",
    5: "WATER",
    6: "HEALTHY SOIL",
    7: "SEED",
    9: "GROW, LITTLE PLANT!",
    10: "SPROUT",
    12: "SUN + WATER + SOIL",
    13: "FLOWER",
    15: "SEED  →  PLANT  →  SEED",
    16: "BEES",
    17: "BEES & BUTTERFLIES",
    18: "NATURE WORKS LIKE A TEAM",
    20: "TREES HELP OUR AIR",
    24: "PLANTS ARE USEFUL",
    25: "BE GENTLE WITH NATURE",
    26: "KEEP NATURE CLEAN",
    27: "CARE FOR NATURE",
    28: "QUIZ: WHAT DO PLANTS NEED?",
    31: "LET'S REMEMBER",
    32: "KEEP EXPLORING!",
}


def frame_image(t: float) -> Image.Image:
    s = scene_of(t)
    cam = cam_for(t)
    base = ground_bg(t).convert("RGBA")
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw_sun_3d(layer, cam, t)

    # clouds as 3D puffs
    for i, cx in enumerate((-2.5, 1.8, 4.0)):
        pr = cam.project((cx + math.sin(t * 0.12 + i) * 0.4, 3.0, 7.5 - i * 0.4))
        if pr:
            blit(layer, ball((255, 255, 255), 28), pr[0], pr[1], 0.45 * pr[3])
            blit(layer, ball((255, 255, 255), 24), pr[0] + 18, pr[1] + 6, 0.32 * pr[3])

    # trees
    draw_tree_3d(layer, cam, (2.4, 0, 4.6), 1.15)
    if s >= 19:
        draw_tree_3d(layer, cam, (1.15, 0, 3.4), 1.55)

    # flowers
    cols = [(255, 90, 130), (255, 190, 40), (140, 90, 255), (40, 210, 170), (255, 110, 70)]
    if s >= 2 or t >= 48:
        for i, col in enumerate(cols):
            draw_flower_3d(layer, cam, (-0.2 + i * 0.38, 0, 3.15), col, t * 1.6 + i)

    # extra bushes
    for bx, bz in [(-2.2, 3.8), (3.1, 3.2)]:
        pr = cam.project((bx, 0.28, bz))
        if pr:
            add_shadow(layer, pr[0], pr[1] + 12, pr[3], 1.3)
            blit(layer, ball((40, 140, 70), 28), pr[0], pr[1], 0.38 * pr[3])

    # carrot / veggies
    if t >= 56:
        pr = cam.project((-0.05, 0.12, 2.7))
        if pr:
            blit(layer, ball((255, 140, 40), 18), pr[0], pr[1], 0.12 * pr[3])

    # bees / butterflies as 3D balls
    if s in (1, 2, 16, 17, 18, 30, 32):
        bx = math.sin(t * 1.2) * 1.4
        bz = 3.0 + math.cos(t * 0.9) * 0.6
        pr = cam.project((bx, 1.35 + math.sin(t * 3) * 0.1, bz))
        if pr:
            blit(layer, ball((255, 210, 40), 14), pr[0], pr[1], 0.09 * pr[3])
        pr2 = cam.project((bx + 0.7, 1.55, bz - 0.3))
        if pr2:
            blit(layer, ball((255, 110, 190), 12), pr2[0] - 8, pr2[1], 0.08 * pr2[3])
            blit(layer, ball((255, 110, 190), 12), pr2[0] + 8, pr2[1], 0.08 * pr2[3])

    # seed / growth
    if 360 <= t < 540:
        age = 0 if t < 480 else min(1.0, (t - 480) / 60)
        pr = cam.project((0.35, 0.08 + age * 0.7, 2.5))
        if pr:
            col = (150, 95, 45) if age < 0.15 else (70, 180, 80)
            blit(layer, ball(col, 18), pr[0], pr[1], (0.08 + age * 0.22) * pr[3])

    # fruits
    if s in (14, 22):
        for i, col in enumerate([(220, 40, 40), (255, 210, 40), (255, 120, 40), (255, 70, 100)]):
            pr = cam.project((0.4 + i * 0.35, 0.85, 3.4))
            if pr:
                blit(layer, ball(col, 18), pr[0], pr[1], 0.16 * pr[3])

    draw_milo_3d(layer, cam, milo_pos(t), t, pose_at(t))

    out = Image.alpha_composite(base, layer)
    d = ImageDraw.Draw(out)
    label = LABELS.get(s)
    if s == 1 and t < 6:
        label = None
    if s == 3:
        if t >= 146:
            label = "LEAVES"
        elif t >= 128:
            label = "STEM"
        elif t >= 110:
            label = "ROOTS"
    if label:
        bbox = d.textbbox((0, 0), label, font=F40)
        tw = bbox[2] - bbox[0]
        x = (W - tw) // 2
        d.rounded_rectangle([x - 18, 18, x + tw + 18, 68], radius=16, fill=(20, 50, 40, 210))
        d.text((x, 26), label, font=F40, fill=(255, 255, 255))
    if s == 28:
        d.rounded_rectangle([180, 90, 1100, 170], radius=16, fill=(255, 255, 255, 220))
        d.text((210, 110), "A Sun   B Water   C Soil   D All of these", font=F40, fill=(30, 90, 50))
    d.rectangle([0, 678, W, H], fill=(12, 28, 36, 230))
    d.text((20, 688), "Milo's Garden  •  3D  •  Plants & Nature", font=F18, fill=(230, 245, 255))
    return out.convert("RGB")


def main():
    import os
    duration = float(os.environ.get("PREVIEW_SEC", DURATION))
    out = Path(os.environ.get("OUT_MP4", str(OUT)))
    total = int(duration * FPS)
    cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
        "-i", "-",
        "-an",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", "20",
        "-movflags", "+faststart",
        str(out),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    assert proc.stdin
    t0 = __import__("time").time()
    for i in range(total):
        t = i / FPS
        img = frame_image(t)
        proc.stdin.write(img.tobytes())
        if i % (FPS * 15) == 0:
            print(f"3D render {int(t)}s / {duration}s", flush=True)
    proc.stdin.close()
    proc.wait()
    print("wrote", out, out.stat().st_size, "in", round(__import__("time").time() - t0, 1), "s")


if __name__ == "__main__":
    main()
