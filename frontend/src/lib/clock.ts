export function formatMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function tickSide(whiteMs: number, blackMs: number, turn: "w" | "b", delta: number) {
  if (turn === "w") return { whiteMs: Math.max(0, whiteMs - delta), blackMs };
  return { whiteMs, blackMs: Math.max(0, blackMs - delta) };
}
