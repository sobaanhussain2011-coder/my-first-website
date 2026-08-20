export type BoardTheme = "walnut" | "slate" | "emerald" | "rosewood";

export type Settings = {
  music: boolean;
  sfx: boolean;
  theme: BoardTheme;
  defaultMinutes: number;
  defaultIncrement: number;
};

const KEY = "wb-settings";

export const defaultSettings: Settings = {
  music: false,
  sfx: true,
  theme: "walnut",
  defaultMinutes: 5,
  defaultIncrement: 0,
};

export function loadSettings(): Settings {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(next: Settings) {
  localStorage.setItem(KEY, JSON.stringify(next));
}
