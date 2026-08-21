import { formatMs, tickSide } from "./clock.ts";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(formatMs(300_000) === "5:00", "5 minutes");
assert(formatMs(61_000) === "1:01", "1:01");
assert(formatMs(0) === "0:00", "zero");
assert(tickSide(1000, 1000, "w", 100).whiteMs === 900, "white ticks");
assert(tickSide(1000, 1000, "b", 100).blackMs === 900, "black ticks");
assert(tickSide(50, 1000, "w", 100).whiteMs === 0, "does not go negative");
console.log("clock checks passed");
