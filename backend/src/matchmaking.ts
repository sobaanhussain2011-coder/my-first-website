import type { AuthedUser } from "./auth.js";

type Ticket = {
  user: AuthedUser;
  socketId: string;
  minutes: number;
  increment: number;
  at: number;
};

const queue: Ticket[] = [];

export function enqueue(user: AuthedUser, socketId: string, minutes: number, increment: number) {
  leave(user.id);
  queue.push({ user, socketId, minutes, increment, at: Date.now() });
}

export function leave(userId: string) {
  const i = queue.findIndex((t) => t.user.id === userId);
  if (i >= 0) queue.splice(i, 1);
}

export function tryMatch() {
  if (queue.length < 2) return null;
  // Rating-aware: pick closest ELO among same time control.
  const a = queue[0];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < queue.length; i++) {
    const b = queue[i];
    if (b.minutes !== a.minutes || b.increment !== a.increment) continue;
    const diff = Math.abs(a.user.elo - b.user.elo);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  const sameClock = queue.findIndex((t, i) => i > 0 && t.minutes === a.minutes && t.increment === a.increment);
  if (sameClock < 0 && queue.length >= 2) {
    const paired = queue.splice(0, 2);
    return paired;
  }
  if (sameClock < 0) return null;
  const b = queue.splice(best, 1)[0];
  queue.shift();
  return [a, b];
}
