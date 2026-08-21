export type BoardTheme = "obsidian" | "walnut" | "emerald" | "rosewood";

export type Settings = {
  music: boolean;
  sfx: boolean;
  theme: BoardTheme;
  defaultMinutes: number;
  defaultIncrement: number;
};

const KEY = "wb-settings-v2";

export const defaultSettings: Settings = {
  music: false,
  sfx: true,
  theme: "obsidian",
  defaultMinutes: 5,
  defaultIncrement: 0,
};

export function loadSettings(): Settings {
  try {
    const raw = { ...defaultSettings, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
    if ((raw.theme as string) === "slate") raw.theme = "obsidian";
    return raw;
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(next: Settings) {
  localStorage.setItem(KEY, JSON.stringify(next));
}
