let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicTimer: number | null = null;
let unlocked = false;

function ac() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  return ctx;
}

export async function unlockAudio() {
  const c = ac();
  if (c.state === "suspended") await c.resume();
  unlocked = c.state === "running";
  return unlocked;
}

if (typeof window !== "undefined") {
  const wake = () => {
    void unlockAudio();
  };
  window.addEventListener("pointerdown", wake, { once: true });
  window.addEventListener("keydown", wake, { once: true });
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, when = 0) {
  const c = ac();
  if (c.state !== "running") return;
  const start = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g);
  g.connect(master!);
  o.start(start);
  o.stop(start + dur + 0.03);
}

export const sfx = {
  move: () => {
    void unlockAudio();
    tone(640, 0.09, "triangle", 0.18);
  },
  capture: () => {
    void unlockAudio();
    tone(210, 0.14, "square", 0.16);
    tone(140, 0.2, "sine", 0.14, 0.04);
  },
  check: () => {
    void unlockAudio();
    tone(880, 0.1, "triangle", 0.16);
    tone(1100, 0.12, "triangle", 0.16, 0.08);
  },
  over: () => {
    void unlockAudio();
    tone(196, 0.22, "sine", 0.2);
    tone(147, 0.4, "sine", 0.16, 0.18);
  },
};

const SALON: [number, number][] = [
  [261.63, 0.28],
  [329.63, 0.28],
  [392.0, 0.42],
  [329.63, 0.28],
  [392.0, 0.28],
  [523.25, 0.5],
  [493.88, 0.28],
  [440.0, 0.28],
  [392.0, 0.42],
  [349.23, 0.28],
  [329.63, 0.28],
  [261.63, 0.55],
];

function playPhrase() {
  const c = ac();
  if (c.state !== "running") return;
  let t = 0;
  tone(130.81, 1.8, "sine", 0.07, 0);
  for (const [freq, dur] of SALON) {
    tone(freq, dur, "triangle", 0.14, t);
    tone(freq / 2, dur, "sine", 0.05, t);
    t += dur;
  }
}

export async function startMusic() {
  stopMusic();
  await unlockAudio();
  playPhrase();
  musicTimer = window.setInterval(playPhrase, 4200);
}

export function stopMusic() {
  if (musicTimer) window.clearInterval(musicTimer);
  musicTimer = null;
}

export function isAudioUnlocked() {
  return unlocked && ctx?.state === "running";
}
