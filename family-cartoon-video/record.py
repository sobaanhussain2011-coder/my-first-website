#!/usr/bin/env python3
"""Open the 3D cartoon in Chrome and record a real MP4 with voice."""
from __future__ import annotations

import os
import signal
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HTML = ROOT / "index.html"
OUT = ROOT / "out"
ART = Path("/opt/cursor/artifacts")
OUT.mkdir(exist_ok=True)
ART.mkdir(parents=True, exist_ok=True)

DURATION = 16
DISPLAY = os.environ.get("DISPLAY", ":1")
CHROME_PROFILE = "/tmp/cartoon-chrome-profile"


def run(cmd, **kw):
    print("+", " ".join(str(c) for c in cmd), flush=True)
    return subprocess.run(cmd, **kw)


def main() -> None:
    audio = OUT / "narration.mp3"
    if not audio.exists():
        run(["python3", str(ROOT / "make_audio.py")], check=True)

    raw = OUT / "raw-silent.mp4"
    final = OUT / "milo-and-the-last-cookie.mp4"
    preview = ART / "milo-and-the-last-cookie.mp4"

    subprocess.run(["pkill", "-f", "cartoon-chrome-profile"], check=False)
    time.sleep(0.6)

    chrome = subprocess.Popen(
        [
            "google-chrome",
            f"--user-data-dir={CHROME_PROFILE}",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-infobars",
            "--disable-session-crashed-bubble",
            "--disable-features=Translate,TranslateUI",
            "--kiosk",
            "--window-position=0,0",
            "--window-size=1920,1200",
            "--autoplay-policy=no-user-gesture-required",
            f"file://{HTML.resolve()}",
        ],
        env={**os.environ, "DISPLAY": DISPLAY},
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    try:
        time.sleep(4.0)
        run(
            [
                "ffmpeg",
                "-y",
                "-f",
                "x11grab",
                "-video_size",
                "1920x1080",
                "-framerate",
                "30",
                "-i",
                f"{DISPLAY}.0+0,60",
                "-t",
                str(DURATION),
                "-an",
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-preset",
                "veryfast",
                "-crf",
                "18",
                str(raw),
            ],
            check=True,
        )
    finally:
        try:
            os.killpg(chrome.pid, signal.SIGTERM)
        except (ProcessLookupError, PermissionError):
            pass

    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(raw),
            "-i",
            str(audio),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            "-shortest",
            "-movflags",
            "+faststart",
            str(final),
        ],
        check=True,
    )
    run(["cp", "-f", str(final), str(preview)], check=True)
    print("FINAL", final)
    print("PREVIEW", preview)


if __name__ == "__main__":
    main()
