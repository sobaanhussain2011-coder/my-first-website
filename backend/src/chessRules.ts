import { Chess, type Square } from "chess.js";

export type ServerMove = {
  from: Square;
  to: Square;
  promotion?: "q" | "r" | "b" | "n";
};

export function newChess(fen?: string) {
  return fen ? new Chess(fen) : new Chess();
}

export function applyMove(fen: string, move: ServerMove) {
  const chess = newChess(fen);
  try {
    const result = chess.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    });
    if (!result) throw new Error("Illegal move.");
    return { chess, san: result.san, captured: Boolean(result.captured) };
  } catch {
    throw new Error("Illegal move.");
  }
}

export function outcome(chess: Chess): { over: boolean; result: string; reason: string | null } {
  if (chess.isCheckmate()) {
    return { over: true, result: chess.turn() === "w" ? "0-1" : "1-0", reason: "checkmate" };
  }
  if (chess.isStalemate()) return { over: true, result: "1/2-1/2", reason: "stalemate" };
  if (chess.isThreefoldRepetition()) return { over: true, result: "1/2-1/2", reason: "threefold" };
  if (chess.isInsufficientMaterial()) return { over: true, result: "1/2-1/2", reason: "insufficient" };
  if (chess.isDraw()) return { over: true, result: "1/2-1/2", reason: "fifty-move" };
  return { over: false, result: "*", reason: null };
}
