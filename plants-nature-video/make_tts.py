#!/usr/bin/env python3
"""Generate a 30-minute voice bed with gTTS + silence."""
from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from gtts import gTTS

from timeline import DURATION, LINES

ROOT = Path(__file__).resolve().parent
AUDIO = ROOT / "audio"
AUDIO.mkdir(exist_ok=True)


def tts_path(i: int) -> Path:
    return AUDIO / f"line_{i:03d}.mp3"


def make_one(i: int, text: str) -> Path:
    out = tts_path(i)
    if out.exists() and out.stat().st_size > 500:
        return out
    slow = i >= 80  # song-ish later lines stay normal except long chant
    tts = gTTS(text=text, lang="en", slow=False)
    tts.save(str(out))
    return out


def main() -> None:
    jobs = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        for i, (_t, text) in enumerate(LINES):
            jobs.append(pool.submit(make_one, i, text))
        for fut in as_completed(jobs):
            p = fut.result()
            print("ok", p.name, flush=True)
    print("tts clips:", len(LINES))


if __name__ == "__main__":
    main()
