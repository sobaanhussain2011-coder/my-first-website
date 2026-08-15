export type LangCode = "en-US" | "hi-IN" | "ur-PK";

export type TabId = "home" | "recordings" | "favorites" | "settings";

export type RecordingItem = {
  id: string;
  title: string;
  text: string;
  createdAt: number;
  durationSec: number;
  favorite: boolean;
};

export const LANGUAGES: { code: LangCode; label: string }[] = [
  { code: "en-US", label: "English" },
  { code: "hi-IN", label: "Hindi" },
  { code: "ur-PK", label: "Urdu" },
];
