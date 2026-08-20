let ctx: AudioContext | null = null;
function ac() {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function beep(freq: number, dur: number, type: OscillatorType = "sine", gain = 0.08) {
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur);
}

export const sfx = {
  move: () => beep(620, 0.07, "triangle", 0.05),
  capture: () => { beep(220, 0.12, "square", 0.05); beep(140, 0.16, "sine", 0.04); },
  check: () => { beep(880, 0.08); setTimeout(() => beep(990, 0.1), 70); },
  over: () => { beep(196, 0.2, "sine", 0.07); setTimeout(() => beep(147, 0.35, "sine", 0.06), 160); },
};

let musicTimer: number | null = null;

export function startMusic() {
  stopMusic();
  const play = () => {
    beep(196, 1.6, "sine", 0.015);
    setTimeout(() => beep(247, 1.6, "sine", 0.012), 400);
  };
  play();
  musicTimer = window.setInterval(play, 3200);
}

export function stopMusic() {
  if (musicTimer) window.clearInterval(musicTimer);
  musicTimer = null;
}
