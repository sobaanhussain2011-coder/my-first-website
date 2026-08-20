export type GameMode = "local" | "ai" | "online" | "friend";
export type TimePreset = "none" | "1" | "3" | "5" | "10" | "15" | "custom";
export type AiLevel = "easy" | "medium" | "hard" | "expert";
export type Color = "w" | "b";
export type GameResult = "1-0" | "0-1" | "1/2-1/2" | "*";
export type BoardTheme = "walnut" | "slate" | "emerald" | "rosewood";

export type TimeControl = {
  preset: TimePreset;
  minutes: number;
  increment: number;
};

export type PlayerPublic = {
  id: string;
  username: string;
  elo: number;
  isGuest: boolean;
};

export type GameOverReason =
  | "checkmate"
  | "stalemate"
  | "threefold"
  | "fifty-move"
  | "insufficient"
  | "agreement"
  | "resignation"
  | "timeout"
  | "abandon";

export type ChatMessage = {
  id: string;
  userId: string;
  username: string;
  text: string;
  at: number;
};
