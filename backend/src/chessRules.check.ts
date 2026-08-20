import { applyMove, newChess, outcome } from "./chessRules.js";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const start = newChess();
assert(start.moves().includes("e4"), "e4 must be legal");
try {
  applyMove(start.fen(), { from: "e2", to: "e5" });
  throw new Error("illegal move should throw");
} catch (err) {
  assert(err instanceof Error && err.message === "Illegal move.", "rejects illegal pawn jump");
}

let fen = start.fen();
for (const [from, to] of [
  ["e2", "e4"],
  ["e7", "e5"],
  ["f1", "c4"],
  ["b8", "c6"],
  ["d1", "h5"],
  ["g8", "f6"],
  ["h5", "f7"],
] as const) {
  fen = applyMove(fen, { from, to }).chess.fen();
}
const mate = newChess(fen);
assert(outcome(mate).reason === "checkmate", "scholar mate detected");
assert(outcome(mate).result === "1-0", "white wins");
console.log("chess rules checks passed");
