/** Standard ELO. K=32 for this MVP. */
export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / 400));
}

export function nextElo(rating: number, opponent: number, score: 0 | 0.5 | 1, k = 32): number {
  return Math.round(rating + k * (score - expectedScore(rating, opponent)));
}
