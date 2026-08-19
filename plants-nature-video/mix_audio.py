#!/usr/bin/env python3
from pathlib import Path

from pydub import AudioSegment

from timeline import DURATION, LINES

ROOT = Path(__file__).resolve().parent
AUDIO = ROOT / "audio"
OUT = ROOT / "out" / "voice30.mp3"
OUT.parent.mkdir(exist_ok=True)


def main() -> None:
    bed = AudioSegment.silent(duration=int(DURATION * 1000))
    # soft warm bed (very quiet sine-like loop from silence + faint noise)
    for i, (start, _text) in enumerate(LINES):
        path = AUDIO / f"line_{i:03d}.mp3"
        if not path.exists():
            print("missing", path)
            continue
        clip = AudioSegment.from_mp3(path)
        pos = int(start * 1000)
        end = pos + len(clip)
        if end > len(bed):
            bed = bed + AudioSegment.silent(duration=end - len(bed) + 500)
        bed = bed.overlay(clip, position=pos)
        print(i, "at", start, "dur", round(len(clip) / 1000, 2))
    # trim/pad to exactly 30 min
    target = int(DURATION * 1000)
    if len(bed) < target:
        bed = bed + AudioSegment.silent(duration=target - len(bed))
    else:
        bed = bed[:target]
    bed.export(OUT, format="mp3", bitrate="128k")
    print("wrote", OUT, "ms", len(bed))


if __name__ == "__main__":
    main()
