import { Chess, type Square } from "chess.js";

export type Promo = "q" | "r" | "b" | "n";

export function createGame(fen?: string) {
  return fen ? new Chess(fen) : new Chess();
}

export function statusText(chess: Chess) {
  if (chess.isCheckmate()) return chess.turn() === "w" ? "Black mates" : "White mates";
  if (chess.isStalemate()) return "Stalemate";
  if (chess.isThreefoldRepetition()) return "Draw by repetition";
  if (chess.isInsufficientMaterial()) return "Draw — insufficient material";
  if (chess.isDraw()) return "Draw";
  if (chess.isCheck()) return chess.turn() === "w" ? "White is in check" : "Black is in check";
  return chess.turn() === "w" ? "White to move" : "Black to move";
}

export function gameOverReason(chess: Chess) {
  if (chess.isCheckmate()) return "checkmate";
  if (chess.isStalemate()) return "stalemate";
  if (chess.isThreefoldRepetition()) return "threefold";
  if (chess.isInsufficientMaterial()) return "insufficient";
  if (chess.isDraw()) return "fifty-move";
  return null;
}

export function resultOf(chess: Chess) {
  if (!chess.isGameOver()) return "*";
  if (chess.isCheckmate()) return chess.turn() === "w" ? "0-1" : "1-0";
  return "1/2-1/2";
}

export function legalTargets(chess: Chess, from: Square) {
  return chess.moves({ square: from, verbose: true });
}
