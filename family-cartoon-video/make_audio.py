#!/usr/bin/env python3
"""Short-clip narration + quiet music bed."""
from __future__ import annotations

from pathlib import Path

from gtts import gTTS
from pydub import AudioSegment
from pydub.generators import Sine

ROOT = Path(__file__).resolve().parent
AUDIO = ROOT / "audio"
OUT = ROOT / "out"
AUDIO.mkdir(exist_ok=True)
OUT.mkdir(exist_ok=True)

DURATION_MS = 16_000

LINES = [
    (0.7, "Meet Milo."),
    (6.6, "This is his sister, Lila."),
    (11.3, "They have one last cookie. What will Milo do?"),
]


def make_tts() -> None:
    for i, (_start, text) in enumerate(LINES):
        path = AUDIO / f"line_{i:03d}.mp3"
        if path.exists() and path.stat().st_size > 400:
            print("have", path.name)
            continue
        gTTS(text=text, lang="en", slow=False).save(str(path))
        print("tts", path.name)


def music_bed(ms: int) -> AudioSegment:
    notes = [261.63, 329.63, 392.00, 523.25]
    bed = AudioSegment.silent(duration=ms)
    for i, hz in enumerate(notes):
        tone = Sine(hz).to_audio_segment(duration=ms).apply_gain(-30 - i)
        bed = bed.overlay(tone)
    return bed.low_pass_filter(1600).apply_gain(-8)


def mix() -> Path:
    bed = music_bed(DURATION_MS)
    voice = AudioSegment.silent(duration=DURATION_MS)
    for i, (start, _text) in enumerate(LINES):
        path = AUDIO / f"line_{i:03d}.mp3"
        clip = AudioSegment.from_mp3(path).apply_gain(+3)
        voice = voice.overlay(clip, position=int(start * 1000))
        print(i, "at", start, "dur", round(len(clip) / 1000, 2))
    mixed = bed.overlay(voice)
    out = OUT / "narration.mp3"
    mixed.export(out, format="mp3", bitrate="160k")
    print("wrote", out)
    return out


if __name__ == "__main__":
    make_tts()
    mix()
