import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  SafeAreaView,
  Share,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { useFonts, Outfit_700Bold, Outfit_800ExtraBold } from "@expo-google-fonts/outfit";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { BottomNav } from "./src/components/BottomNav";
import { HomeScreen } from "./src/screens/HomeScreen";
import { RecordingsScreen } from "./src/screens/RecordingsScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { loadRecordings, saveRecordings } from "./src/storage";
import { colors } from "./src/theme";
import type { RecordingItem, TabId } from "./src/types";

export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_700Bold,
    Outfit_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [tab, setTab] = useState<TabId>("home");
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);

  useEffect(() => {
    void loadRecordings().then(setRecordings);
  }, []);

  const persist = useCallback(async (next: RecordingItem[]) => {
    setRecordings(next);
    await saveRecordings(next);
  }, []);

  const onSaveRecording = useCallback(
    (item: Omit<RecordingItem, "id" | "favorite">) => {
      const next: RecordingItem[] = [
        {
          ...item,
          id: `${Date.now()}`,
          favorite: false,
        },
        ...recordings,
      ];
      void persist(next);
    },
    [persist, recordings]
  );

  const onToggleFavorite = useCallback(
    (id: string) => {
      const next = recordings.map((r) =>
        r.id === id ? { ...r, favorite: !r.favorite } : r
      );
      void persist(next);
    },
    [persist, recordings]
  );

  const onDelete = useCallback(
    (id: string) => {
      void persist(recordings.filter((r) => r.id !== id));
    },
    [persist, recordings]
  );

  const onOpen = useCallback((item: RecordingItem) => {
    Alert.alert(item.title, item.text, [
      { text: "Close", style: "cancel" },
      {
        text: "Share",
        onPress: () => {
          void Share.share({ message: item.text, title: item.title });
        },
      },
    ]);
  }, []);

  if (!fontsLoaded) {
    return <View style={styles.boot} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={styles.body}>
        {tab === "home" ? <HomeScreen onSaveRecording={onSaveRecording} /> : null}
        {tab === "recordings" ? (
          <RecordingsScreen
            items={recordings}
            onToggleFavorite={onToggleFavorite}
            onDelete={onDelete}
            onOpen={onOpen}
          />
        ) : null}
        {tab === "favorites" ? (
          <RecordingsScreen
            items={recordings}
            favoritesOnly
            onToggleFavorite={onToggleFavorite}
            onDelete={onDelete}
            onOpen={onOpen}
          />
        ) : null}
        {tab === "settings" ? <SettingsScreen /> : null}
      </View>
      <BottomNav active={tab} onChange={setTab} />
      {Platform.OS === "android" ? <View style={styles.androidPad} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: colors.bg },
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0,
  },
  body: { flex: 1 },
  androidPad: { height: 4, backgroundColor: colors.bgElevated },
});
