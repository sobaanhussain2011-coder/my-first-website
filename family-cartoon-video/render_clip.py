#!/usr/bin/env python3
"""16-second stylized 3D character preview: Milo, Lila, last cookie."""
from __future__ import annotations

import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 720
FPS = 20
DURATION = 16.0
ROOT = Path(__file__).resolve().parent
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)
ART = Path("/opt/cursor/artifacts")
ART.mkdir(parents=True, exist_ok=True)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size: int):
    try:
        return ImageFont.truetype(FONT, size)
    except OSError:
        return ImageFont.load_default()


F48 = font(48)
F28 = font(28)


def lerp(a, b, t):
    t = max(0.0, min(1.0, t))
    return a + (b - a) * t


def make_sphere(r: int, rgb, light=(-0.4, -0.5, 0.78)) -> Image.Image:
    r = int(max(5, min(r, 56)))
    y, x = np.mgrid[-r : r + 1, -r : r + 1]
    nx = x / r
    ny = y / r
    d2 = nx * nx + ny * ny
    nz = np.sqrt(np.clip(1.0 - d2, 0, 1))
    lx, ly, lz = light
    ln = math.sqrt(lx * lx + ly * ly + lz * lz)
    lx, ly, lz = lx / ln, ly / ln, lz / ln
    diff = np.clip(nx * lx + ny * ly + nz * lz, 0, 1)
    spec = diff ** 12
    s = np.clip(0.38 + 0.78 * diff, 0, 1)
    cr, cg, cb = [c / 255.0 for c in rgb]
    rr = np.clip((cr * s + 0.5 * spec) * 255, 0, 255).astype(np.uint8)
    gg = np.clip((cg * s + 0.5 * spec) * 255, 0, 255).astype(np.uint8)
    bb = np.clip((cb * s + 0.5 * spec) * 255, 0, 255).astype(np.uint8)
    a = np.where(d2 < 0.97, 255, 0).astype(np.uint8)
    a = np.where(d2 >= 1.0, 0, a)
    return Image.fromarray(np.dstack([rr, gg, bb, a]), "RGBA")


SPHERES: dict[tuple, Image.Image] = {}


def ball(rgb, r: int = 28) -> Image.Image:
    key = (rgb, r)
    if key not in SPHERES:
        SPHERES[key] = make_sphere(r, rgb)
    return SPHERES[key]


class Cam:
    def __init__(self, eye, look, fov=38):
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
        if z < 0.6:
            return None
        fl = (H * 0.52) / math.tan(math.radians(self.fov) * 0.5)
        sx = W * 0.5 + x * fl / z
        sy = H * 0.58 - y * fl / z
        scale = min(260.0, fl / z)
        return sx, sy, z, scale


def blit(dst: Image.Image, sprite: Image.Image, cx: float, cy: float, radius: float):
    if radius < 2:
        return
    size = int(max(4, min(radius * 2, 220)))
    sp = sprite.resize((size, size), Image.BILINEAR)
    x = int(cx - size / 2)
    y = int(cy - size / 2)
    dst.alpha_composite(sp, (x, y))


def add_shadow(dst: Image.Image, sx, sy, scale, mul=1.0):
    rw = int(max(10, min(34 * scale * mul, 110)))
    rh = int(max(5, min(12 * scale * mul, 40)))
    shadow = Image.new("RGBA", (rw * 2, rh * 2), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse([0, 0, rw * 2 - 1, rh * 2 - 1], fill=(0, 0, 0, 60))
    dst.alpha_composite(shadow, (int(sx - rw), int(sy - rh * 0.15)))


def kitchen_bg() -> Image.Image:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # sky through window area first as wall
    for y in range(H):
        p = y / (H - 1)
        col = (
            int(lerp(255, 255, p)),
            int(lerp(226, 210, p)),
            int(lerp(186, 160, p)),
        )
        d.line([(0, y), (W, y)], fill=col + (255,))
    # floor
    d.polygon([(0, 430), (W, 400), (W, H), (0, H)], fill=(232, 186, 122, 255))
    d.polygon([(0, 560), (W, 530), (W, H), (0, H)], fill=(210, 160, 96, 255))
    # back counter
    d.rounded_rectangle([720, 210, 1240, 340], 16, fill=(224, 112, 52, 255))
    d.rounded_rectangle([740, 228, 900, 318], 10, fill=(255, 186, 92, 255))
    d.rounded_rectangle([920, 228, 1080, 318], 10, fill=(255, 186, 92, 255))
    d.rounded_rectangle([1100, 228, 1220, 318], 10, fill=(255, 186, 92, 255))
    # window
    d.rounded_rectangle([90, 70, 430, 320], 18, fill=(138, 75, 34, 255))
    d.rounded_rectangle([112, 90, 408, 300], 12, fill=(150, 220, 255, 255))
    d.ellipse([300, 108, 368, 176], fill=(255, 224, 90, 255))
    d.rectangle([248, 90, 268, 300], fill=(138, 75, 34, 255))
    d.rectangle([112, 184, 408, 204], fill=(138, 75, 34, 255))
    # table top
    d.ellipse([430, 430, 900, 560], fill=(168, 96, 42, 255))
    d.ellipse([450, 442, 880, 538], fill=(196, 122, 56, 255))
    d.rectangle([520, 520, 560, 680], fill=(138, 75, 34, 255))
    d.rectangle([770, 520, 810, 680], fill=(138, 75, 34, 255))
    # plate
    d.ellipse([600, 456, 730, 516], fill=(255, 246, 236, 255))
    d.ellipse([618, 466, 712, 506], fill=(240, 228, 214, 255))
    return img


BG = kitchen_bg()


def draw_parts(layer, cam, parts):
    projected = []
    for p, col, rad in parts:
        pr = cam.project(p)
        if not pr:
            continue
        sx, sy, depth, scale = pr
        projected.append((depth, sx, sy, scale, col, rad))
    projected.sort(key=lambda q: -q[0])
    for _d, sx, sy, scale, col, rad in projected:
        blit(layer, ball(col, 32), sx, sy, rad * scale)


def character(layer, cam, pos, t, kind, pose):
    x, y, z = pos
    bob = math.sin(t * 3.0) * 0.03
    blink = 1.0 if (math.sin(t * 2.4 + (0 if kind == "milo" else 1.4)) < 0.92) else 0.15
    if kind == "milo":
        skin, shirt, pants, hair, iris, shoe = (
            (240, 180, 138),
            (58, 123, 253),
            (61, 74, 106),
            (74, 42, 20),
            (58, 106, 214),
            (43, 51, 72),
        )
        scale_c = 1.0
    else:
        skin, shirt, pants, hair, iris, shoe = (
            (243, 194, 154),
            (255, 107, 138),
            (255, 209, 102),
            (212, 106, 26),
            (58, 163, 106),
            (255, 143, 171),
        )
        scale_c = 0.86

    hy = y + 1.22 * scale_c + bob
    parts = []
    # shoes / legs / body
    walk = math.sin(t * 8) * 0.08 if pose == "walk" else 0
    parts += [
        ((x - 0.13 * scale_c, y + 0.04, z + walk), shoe, 0.11 * scale_c),
        ((x + 0.13 * scale_c, y + 0.04, z - walk), shoe, 0.11 * scale_c),
        ((x - 0.11 * scale_c, y + 0.26 * scale_c, z + walk * 0.4), pants, 0.12 * scale_c),
        ((x + 0.11 * scale_c, y + 0.26 * scale_c, z - walk * 0.4), pants, 0.12 * scale_c),
        ((x, y + 0.58 * scale_c, z), shirt, 0.30 * scale_c),
        ((x, y + 0.78 * scale_c, z), shirt, 0.26 * scale_c),
    ]
    # arms
    if pose == "hold":
        parts += [
            ((x - 0.34 * scale_c, y + 0.62 * scale_c, z + 0.04), skin, 0.09 * scale_c),
            ((x + 0.36 * scale_c, y + 0.70 * scale_c, z + 0.16), skin, 0.09 * scale_c),
            ((x + 0.46 * scale_c, y + 0.82 * scale_c, z + 0.22), skin, 0.10 * scale_c),
        ]
    elif pose == "wave":
        ang = -0.5 + math.sin(t * 9) * 0.55
        parts += [
            ((x - 0.32 * scale_c, y + 0.60 * scale_c, z), skin, 0.09 * scale_c),
            ((x + 0.34 * scale_c, y + 0.78 * scale_c + math.sin(ang) * 0.16, z + 0.08), skin, 0.09 * scale_c),
            ((x + 0.46 * scale_c, y + 1.00 * scale_c + math.cos(ang) * 0.14, z + 0.1), skin, 0.10 * scale_c),
        ]
    else:
        parts += [
            ((x - 0.34 * scale_c, y + 0.58 * scale_c, z + 0.02), skin, 0.09 * scale_c),
            ((x + 0.34 * scale_c, y + 0.58 * scale_c, z + 0.02), skin, 0.09 * scale_c),
        ]
    # head + hair + face
    parts += [
        ((x, hy, z), skin, 0.32 * scale_c),
        ((x, hy - 0.12 * scale_c, z + 0.04), skin, 0.22 * scale_c),
        ((x, hy + 0.16 * scale_c, z - 0.02), hair, 0.28 * scale_c),
        ((x, hy + 0.22 * scale_c, z + 0.16), hair, 0.14 * scale_c),
    ]
    if kind == "milo":
        parts += [
            ((x - 0.20 * scale_c, hy + 0.04, z + 0.08), hair, 0.12 * scale_c),
            ((x + 0.20 * scale_c, hy + 0.04, z + 0.08), hair, 0.12 * scale_c),
        ]
    else:
        parts += [
            ((x - 0.28 * scale_c, hy + 0.10, z + 0.02), hair, 0.12 * scale_c),
            ((x + 0.28 * scale_c, hy + 0.10, z + 0.02), hair, 0.12 * scale_c),
        ]
    # blush + nose
    parts += [
        ((x - 0.16 * scale_c, hy - 0.06 * scale_c, z + 0.24), (255, 154, 160), 0.06 * scale_c),
        ((x + 0.16 * scale_c, hy - 0.06 * scale_c, z + 0.24), (255, 154, 160), 0.06 * scale_c),
        ((x, hy - 0.02 * scale_c, z + 0.30), skin, 0.055 * scale_c),
    ]
    # eyes
    eye_z = z + 0.26
    eye_y = hy + 0.05 * scale_c
    er = 0.085 * scale_c * blink
    if blink > 0.4:
        parts += [
            ((x - 0.11 * scale_c, eye_y, eye_z), (255, 252, 248), er),
            ((x + 0.11 * scale_c, eye_y, eye_z), (255, 252, 248), er),
            ((x - 0.10 * scale_c, eye_y, eye_z + 0.04), iris, 0.045 * scale_c),
            ((x + 0.12 * scale_c, eye_y, eye_z + 0.04), iris, 0.045 * scale_c),
            ((x - 0.10 * scale_c, eye_y, eye_z + 0.07), (20, 16, 24), 0.022 * scale_c),
            ((x + 0.12 * scale_c, eye_y, eye_z + 0.07), (20, 16, 24), 0.022 * scale_c),
            ((x - 0.13 * scale_c, eye_y + 0.02 * scale_c, eye_z + 0.08), (255, 255, 255), 0.016 * scale_c),
            ((x + 0.09 * scale_c, eye_y + 0.02 * scale_c, eye_z + 0.08), (255, 255, 255), 0.016 * scale_c),
        ]

    g = cam.project((x, 0.02, z))
    if g:
        add_shadow(layer, g[0], g[1], g[3], 1.5 * scale_c)
    draw_parts(layer, cam, parts)
    # smile in 2D after head project
    hp = cam.project((x, hy - 0.14 * scale_c, z + 0.28))
    if hp:
        d = ImageDraw.Draw(layer)
        r = 0.09 * scale_c * hp[3]
        d.arc(
            [hp[0] - r, hp[1] - r * 0.35, hp[0] + r, hp[1] + r * 0.85],
            15,
            165,
            fill=(196, 80, 86, 255),
            width=max(3, int(r * 0.18)),
        )


def cookie(layer, cam, pos, split=0.0):
    x, y, z = pos
    if split <= 0:
        draw_parts(
            layer,
            cam,
            [
                ((x, y, z), (201, 132, 42), 0.13),
                ((x - 0.04, y + 0.03, z + 0.05), (58, 34, 20), 0.03),
                ((x + 0.05, y + 0.02, z + 0.03), (58, 34, 20), 0.028),
                ((x + 0.01, y + 0.04, z - 0.02), (58, 34, 20), 0.025),
            ],
        )
    else:
        draw_parts(
            layer,
            cam,
            [
                ((x - 0.08 * split, y, z), (201, 132, 42), 0.10),
                ((x + 0.08 * split, y, z + 0.02), (201, 132, 42), 0.10),
            ],
        )


def subtitle_for(t: float) -> str:
    if 0.5 <= t < 4.4:
        return "Meet Milo."
    if 6.5 <= t < 10.6:
        return "This is his sister, Lila."
    if t >= 11.2:
        return "They have one last cookie. What will Milo do?"
    return ""


def title_for(t: float) -> str:
    if t < 3.3:
        return "MILO & LILA"
    if t > 14.4:
        return "SHORT CLIP"
    return ""


def frame_at(t: float) -> Image.Image:
    img = BG.copy()
    if t < 6.4:
        cam = Cam((0.15, 1.35, 4.6), (-0.25, 1.05, 1.4), fov=34)
        milo_pos = (-0.35, 0.0, 1.45)
        lila_pos = (1.8, 0.0, 2.4)
        cookie_pos = (0.22, 1.05, 1.55)
        character(img, cam, milo_pos, t, "milo", "hold")
        cookie(img, cam, cookie_pos)
        character(img, cam, lila_pos, t, "lila", "idle")
    elif t < 11.2:
        u = min(1.0, (t - 6.4) / 1.5)
        cam = Cam((0.25, 1.28, 5.0), (0.05, 0.95, 1.35), fov=36)
        milo_pos = (-0.4, 0.0, 1.45)
        lila_pos = (1.75 - u * 1.2, 0.0, 2.3 - u * 0.85)
        character(img, cam, milo_pos, t, "milo", "idle")
        cookie(img, cam, (0.05, 0.98, 1.15))
        character(img, cam, lila_pos, t, "lila", "walk" if u < 1 else "idle")
    else:
        cam = Cam((0.1, 1.22, 5.15), (0.05, 0.95, 1.3), fov=36)
        character(img, cam, (-0.42, 0.0, 1.4), t, "milo", "wave")
        cookie(img, cam, (0.02, 0.98, 1.15))
        character(img, cam, (0.48, 0.0, 1.4), t, "lila", "wave")

    d = ImageDraw.Draw(img)
    title = title_for(t)
    if title:
        bbox = d.textbbox((0, 0), title, font=F48)
        tw = bbox[2] - bbox[0]
        d.text(((W - tw) / 2, 28), title, font=F48, fill=(255, 248, 232, 255), stroke_width=4, stroke_fill=(90, 42, 16, 255))
    sub = subtitle_for(t)
    if sub:
        bbox = d.textbbox((0, 0), sub, font=F28)
        tw = bbox[2] - bbox[0]
        pad = 18
        box = [W / 2 - tw / 2 - pad, H - 86, W / 2 + tw / 2 + pad, H - 28]
        d.rounded_rectangle(box, 18, fill=(40, 18, 28, 200))
        d.text((W / 2 - tw / 2, H - 76), sub, font=F28, fill=(255, 253, 246, 255))
    return img.convert("RGB")


def main() -> None:
    raw = OUT / "clip-silent.mp4"
    final = OUT / "milo-and-the-last-cookie.mp4"
    audio = OUT / "narration.mp3"
    if not audio.exists():
        subprocess.run(["python3", str(ROOT / "make_audio.py")], check=True)

    frames = int(DURATION * FPS)
    cmd = [
        "ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}", "-r", str(FPS), "-i", "pipe:0",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", "18",
        str(raw),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    assert proc.stdin is not None
    for i in range(frames):
        t = i / FPS
        img = frame_at(t)
        proc.stdin.write(img.tobytes())
        if i % 40 == 0:
            print(f"frame {i}/{frames} t={t:.1f}", flush=True)
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit("ffmpeg raw encode failed")

    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(raw), "-i", str(audio),
            "-map", "0:v:0", "-map", "1:a:0",
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "18",
            "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart",
            str(final),
        ],
        check=True,
    )
    preview = ART / "milo-and-the-last-cookie.mp4"
    subprocess.run(["cp", "-f", str(final), str(preview)], check=True)
    print("FINAL", final)
    print("PREVIEW", preview)


if __name__ == "__main__":
    main()
