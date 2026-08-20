export type Me = {
  id: string;
  username: string;
  isGuest: boolean;
  elo: number;
  wins?: number;
  losses?: number;
  draws?: number;
};

const TOKEN = "wb-token";

export function getToken() {
  return localStorage.getItem(TOKEN);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN, token);
  else localStorage.removeItem(TOKEN);
}

async function req(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(path, { ...init, headers, credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const api = {
  guest: (username?: string) => req("/auth/guest", { method: "POST", body: JSON.stringify({ username }) }),
  me: () => req("/auth/me"),
  logout: () => req("/auth/logout", { method: "POST" }),
  profile: () => req("/users/profile"),
  history: () => req("/games/history"),
  game: (id: string) => req(`/games/${id}`),
  saveOffline: (body: unknown) => req("/games/offline", { method: "POST", body: JSON.stringify(body) }),
  username: (username: string) => req("/users/username", { method: "POST", body: JSON.stringify({ username }) }),
};
