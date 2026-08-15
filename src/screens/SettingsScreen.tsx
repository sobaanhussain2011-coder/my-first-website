import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as IntentLauncher from "expo-intent-launcher";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "../theme";

export function SettingsScreen() {
  const openKeyboardSettings = async () => {
    if (Platform.OS !== "android") {
      Alert.alert(
        "Android only",
        "VoiceNote Keyboard (system keyboard) is available on Android builds."
      );
      return;
    }
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.INPUT_METHOD_SETTINGS
      );
    } catch {
      Alert.alert(
        "Open settings",
        "Settings → System → Languages & input → Enable VoiceNote Keyboard."
      );
    }
  };

  const showShortcuts = () => {
    Alert.alert(
      "Shortcuts",
      "1) Tap mic on Home to start live transcription\n2) Copy / Share / Save from Live Transcription\n3) Enable Keyboard to type into WhatsApp & more\n4) Star recordings in Favorites"
    );
  };

  const showHelp = () => {
    Alert.alert(
      "Help & Support",
      "Need live voice in other apps?\nEnable VoiceNote Keyboard, open any chat box, switch keyboard to VoiceNote, then speak.\n\nFor best results use a quiet room and speak clearly."
    );
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.sub}>Keyboard, shortcuts, and account tools</Text>

      <Pressable onPress={openKeyboardSettings} style={styles.row}>
        <Text style={styles.rowTitle}>Enable VoiceNote Keyboard</Text>
        <Text style={styles.rowBody}>
          Connect to WhatsApp, Instagram, Gmail — any typing app
        </Text>
      </Pressable>

      <Pressable onPress={showShortcuts} style={styles.row}>
        <Text style={styles.rowTitle}>Shortcuts</Text>
        <Text style={styles.rowBody}>Quick guide for Home and keyboard</Text>
      </Pressable>

      <Pressable onPress={showHelp} style={styles.row}>
        <Text style={styles.rowTitle}>Help & Support</Text>
        <Text style={styles.rowBody}>How to use live transcription everywhere</Text>
      </Pressable>

      <LinearGradient colors={["#2A1B4D", "#161225"]} style={styles.premium}>
        <Text style={styles.premiumEyebrow}>Go Premium</Text>
        <Text style={styles.premiumTitle}>Unlock unlimited transcriptions</Text>
        <Text style={styles.premiumBody}>
          Better accuracy and more storage coming soon.
        </Text>
        <Pressable
          style={styles.premiumBtn}
          onPress={() =>
            Alert.alert("Coming soon", "Premium unlock will be added later.")
          }
        >
          <Text style={styles.premiumBtnText}>Upgrade Now →</Text>
        </Pressable>
      </LinearGradient>

      <View style={styles.storage}>
        <Text style={styles.storageLabel}>Storage</Text>
        <Text style={styles.storageValue}>Local device saves</Text>
        <View style={styles.barTrack}>
          <View style={styles.barFill} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 28, gap: 12 },
  title: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 28,
    color: colors.text,
  },
  sub: {
    marginTop: -4,
    marginBottom: 8,
    fontFamily: "DMSans_400Regular",
    color: colors.textMuted,
    fontSize: 14,
  },
  row: {
    backgroundColor: colors.panel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  rowTitle: {
    fontFamily: "Outfit_700Bold",
    color: colors.text,
    fontSize: 15,
  },
  rowBody: {
    marginTop: 4,
    fontFamily: "DMSans_400Regular",
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  premium: {
    marginTop: 8,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  premiumEyebrow: {
    color: colors.gold,
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
  },
  premiumTitle: {
    marginTop: 6,
    color: colors.text,
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 20,
  },
  premiumBody: {
    marginTop: 6,
    color: colors.textMuted,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  premiumBtn: {
    marginTop: 14,
    alignSelf: "flex-start",
    backgroundColor: colors.purple,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  premiumBtnText: {
    color: colors.white,
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
  },
  storage: {
    marginTop: 4,
    backgroundColor: colors.panel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  storageLabel: {
    fontFamily: "DMSans_700Bold",
    color: colors.text,
    fontSize: 13,
  },
  storageValue: {
    marginTop: 4,
    fontFamily: "DMSans_400Regular",
    color: colors.textMuted,
    fontSize: 12,
  },
  barTrack: {
    marginTop: 10,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#222233",
    overflow: "hidden",
  },
  barFill: {
    width: "24%",
    height: "100%",
    backgroundColor: colors.purpleBright,
  },
});
