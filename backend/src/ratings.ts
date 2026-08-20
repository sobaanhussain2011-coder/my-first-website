import { nextElo } from "./catalog.js";
import { prisma } from "./db.js";

export async function finishRated(whiteId: string | null, blackId: string | null, result: string, reason: string | null) {
  if (!whiteId || !blackId || result === "*") return;
  const [white, black] = await Promise.all([
    prisma.user.findUnique({ where: { id: whiteId } }),
    prisma.user.findUnique({ where: { id: blackId } }),
  ]);
  if (!white || !black) return;

  const whiteScore = result === "1-0" ? 1 : result === "0-1" ? 0 : 0.5;
  const blackScore = (1 - whiteScore) as 0 | 0.5 | 1;
  const whiteElo = nextElo(white.elo, black.elo, whiteScore as 0 | 0.5 | 1);
  const blackElo = nextElo(black.elo, white.elo, blackScore);

  await applyRecord(white.id, whiteScore, whiteElo, reason === "checkmate" && whiteScore === 1);
  await applyRecord(black.id, blackScore, blackElo, reason === "checkmate" && blackScore === 1);
}

async function applyRecord(id: string, score: number, elo: number, checkmate: boolean) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return;
  const win = score === 1;
  const draw = score === 0.5;
  await prisma.user.update({
    where: { id },
    data: {
      elo,
      wins: user.wins + (win ? 1 : 0),
      losses: user.losses + (!win && !draw ? 1 : 0),
      draws: user.draws + (draw ? 1 : 0),
      checkmates: user.checkmates + (checkmate ? 1 : 0),
      winStreak: win ? user.winStreak + 1 : 0,
    },
  });
  await unlockAchievements(id);
}

export async function recordUnrated(id: string | null, score: number, reason: string | null) {
  if (!id) return;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return;
  const win = score === 1;
  const draw = score === 0.5;
  await prisma.user.update({
    where: { id },
    data: {
      wins: user.wins + (win ? 1 : 0),
      losses: user.losses + (!win && !draw ? 1 : 0),
      draws: user.draws + (draw ? 1 : 0),
      checkmates: user.checkmates + (reason === "checkmate" && win ? 1 : 0),
      winStreak: win ? user.winStreak + 1 : 0,
    },
  });
  await unlockAchievements(id);
}

async function unlockAchievements(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { achievements: true },
  });
  if (!user) return;
  const have = new Set(user.achievements.map((a) => a.achievementKey));
  const games = user.wins + user.losses + user.draws;
  const keys: string[] = [];
  if (games >= 1) keys.push("first_game");
  if (user.wins >= 1) keys.push("first_win");
  if (user.winStreak >= 3) keys.push("win_streak_3");
  if (user.winStreak >= 5) keys.push("win_streak_5");
  if (games >= 10) keys.push("games_10");
  if (games >= 50) keys.push("games_50");
  if (user.checkmates >= 1) keys.push("checkmate_1");
  if (user.checkmates >= 10) keys.push("checkmate_10");
  if (user.wins >= 1 && !user.isGuest) keys.push("rated_win");
  for (const key of keys) {
    if (have.has(key)) continue;
    await prisma.userAchievement.create({
      data: { userId, achievementKey: key },
    }).catch(() => undefined);
  }
}

export async function unlockKey(userId: string | null, key: string) {
  if (!userId) return;
  await prisma.userAchievement.create({
    data: { userId, achievementKey: key },
  }).catch(() => undefined);
}
