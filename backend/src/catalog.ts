export type AchievementDef = {
  key: string;
  title: string;
  description: string;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first_game", title: "First Board", description: "Play your first completed game." },
  { key: "first_win", title: "First Blood", description: "Win your first game." },
  { key: "win_streak_3", title: "Hat Trick", description: "Win 3 games in a row." },
  { key: "win_streak_5", title: "On Fire", description: "Win 5 games in a row." },
  { key: "games_10", title: "Regular", description: "Complete 10 games." },
  { key: "games_50", title: "Club Member", description: "Complete 50 games." },
  { key: "checkmate_1", title: "Mate", description: "Deliver a checkmate." },
  { key: "checkmate_10", title: "Executioner", description: "Deliver 10 checkmates." },
  { key: "ai_hard", title: "Engine Wrangler", description: "Beat the computer on Hard or Expert." },
  { key: "rated_win", title: "On the List", description: "Win a rated online game." },
];

export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / 400));
}

export function nextElo(rating: number, opponent: number, score: 0 | 0.5 | 1, k = 32): number {
  return Math.round(rating + k * (score - expectedScore(rating, opponent)));
}
