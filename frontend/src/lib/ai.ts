import { Chess } from "chess.js";

const VALUES: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

function evaluate(chess: Chess) {
  if (chess.isCheckmate()) return chess.turn() === "w" ? -99999 : 99999;
  if (chess.isDraw()) return 0;
  let score = 0;
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell) continue;
      const v = VALUES[cell.type] || 0;
      score += cell.color === "w" ? v : -v;
    }
  }
  score += chess.moves().length * (chess.turn() === "w" ? 1 : -1);
  return score;
}

function search(chess: Chess, depth: number, alpha: number, beta: number): number {
  if (depth === 0 || chess.isGameOver()) return evaluate(chess);
  const moves = chess.moves();
  if (chess.turn() === "w") {
    let best = -Infinity;
    for (const m of moves) {
      chess.move(m);
      best = Math.max(best, search(chess, depth - 1, alpha, beta));
      chess.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    chess.move(m);
    best = Math.min(best, search(chess, depth - 1, alpha, beta));
    chess.undo();
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

export type AiLevel = "easy" | "medium" | "hard" | "expert";

const DEPTH: Record<AiLevel, number> = { easy: 1, medium: 2, hard: 3, expert: 3 };

export function pickAiMove(fen: string, level: AiLevel) {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (!moves.length) return null;
  if (level === "easy" && Math.random() < 0.45) {
    return moves[Math.floor(Math.random() * moves.length)];
  }
  const depth = DEPTH[level];
  let bestMove = moves[0];
  let best = chess.turn() === "w" ? -Infinity : Infinity;
  for (const m of moves) {
    chess.move(m);
    const score = search(chess, depth - 1, -Infinity, Infinity);
    chess.undo();
    if (chess.turn() === "w" ? score > best : score < best) {
      best = score;
      bestMove = m;
    }
  }
  return bestMove;
}

export function hintMove(fen: string) {
  return pickAiMove(fen, "expert");
}
