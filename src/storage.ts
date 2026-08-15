import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RecordingItem } from "./types";

const KEY = "voicenote.recordings.v1";

export async function loadRecordings(): Promise<RecordingItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecordingItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveRecordings(items: RecordingItem[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}
