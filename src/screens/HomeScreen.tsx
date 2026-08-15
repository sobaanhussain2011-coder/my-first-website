import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import * as IntentLauncher from "expo-intent-launcher";
import { MicButton } from "../components/MicButton";
import { Waveform } from "../components/Waveform";
import { formatTimer, useLiveSpeech } from "../hooks/useLiveSpeech";
import { colors } from "../theme";
import { LANGUAGES, type LangCode, type RecordingItem } from "../types";

type Props = {
  onSaveRecording: (item: Omit<RecordingItem, "id" | "favorite">) => void;
};

export function HomeScreen({ onSaveRecording }: Props) {
  const [lang, setLang] = useState<LangCode>("en-US");
  const [langOpen, setLangOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const {
    listening,
    message,
    liveText,
    errorMessage,
    elapsedSec,
    toggle,
    clearText,
    stopListening,
  } = useLiveSpeech(lang);

  const langLabel = useMemo(
    () => LANGUAGES.find((l) => l.code === lang)?.label ?? "English",
    [lang]
  );

  const hasText = message.length > 0;

  const copyText = async () => {
    if (!hasText) {
      Alert.alert("Nothing to copy", "Speak first, then copy.");
      return;
    }
    await Clipboard.setStringAsync(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const shareText = async () => {
    if (!hasText) {
      Alert.alert("Nothing to share", "Speak first, then share to any app.");
      return;
    }
    await Share.share({ message, title: "VoiceNote" });
  };

  const saveRecording = () => {
    if (!hasText) {
      Alert.alert("Nothing to save", "Speak first, then save.");
      return;
    }
    if (listening) stopListening();
    const title =
      message.slice(0, 28).trim() + (message.length > 28 ? "…" : "");
    onSaveRecording({
      title: title || "Untitled recording",
      text: message,
      createdAt: Date.now(),
      durationSec: elapsedSec,
    });
    Alert.alert("Saved", "Recording saved to Recordings.");
  };

  const openKeyboardSettings = async () => {
    if (Platform.OS !== "android") {
      Alert.alert(
        "Android only",
        "VoiceNote Keyboard works on Android to type into other apps."
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

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <LinearGradient
            colors={[colors.purpleBright, colors.purpleDeep]}
            style={styles.logoMark}
          />
          <Text style={styles.brand}>VoiceNote</Text>
        </View>
        <View style={styles.profileChip}>
          <Text style={styles.profileText}>SH</Text>
        </View>
      </View>

      <Text style={styles.hero}>
        Turn your <Text style={styles.heroAccent}>voice</Text> into text
      </Text>
      <Text style={styles.heroSub}>Speak naturally. We&apos;ll handle the words.</Text>

      <Pressable
        onPress={() => !listening && setLangOpen((v) => !v)}
        style={styles.langBtn}
      >
        <Text style={styles.langBtnText}>{langLabel}</Text>
        <Text style={styles.langChevron}>{langOpen ? "▴" : "▾"}</Text>
      </Pressable>
      {langOpen ? (
        <View style={styles.langMenu}>
          {LANGUAGES.map((item) => (
            <Pressable
              key={item.code}
              onPress={() => {
                setLang(item.code);
                setLangOpen(false);
              }}
              style={styles.langItem}
            >
              <Text
                style={[
                  styles.langItemText,
                  item.code === lang && styles.langItemOn,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <LinearGradient
        colors={["#1B1530", "#12121C"]}
        style={styles.recordPanel}
      >
        <View style={styles.timerRow}>
          <View style={[styles.liveDot, listening && styles.liveDotOn]} />
          <Text style={styles.timer}>{formatTimer(elapsedSec)}</Text>
          <Text style={styles.recLabel}>
            {listening ? "Recording..." : "Ready"}
          </Text>
        </View>

        <Waveform active={listening} />
        <MicButton listening={listening} onPress={toggle} />
        <Text style={styles.micHint}>
          {listening ? "Tap to stop recording" : "Tap mic to start recording"}
        </Text>
      </LinearGradient>

      <View style={styles.transcriptPanel}>
        <View style={styles.transcriptHeader}>
          <View style={styles.transcriptTitleRow}>
            <Text style={styles.transcriptTitle}>Live Transcription</Text>
            {listening ? (
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>+ Live</Text>
              </View>
            ) : null}
          </View>
          <Pressable onPress={clearText}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.transcriptScroll}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          <Text
            style={[styles.transcriptBody, !hasText && styles.placeholder]}
          >
            {hasText
              ? message
              : "Your words will appear here in real time as you speak…"}
            {!!liveText ? <Text style={styles.caret}>|</Text> : null}
          </Text>
        </ScrollView>

        {errorMessage ? (
          <Text style={styles.error}>{errorMessage}</Text>
        ) : null}

        <View style={styles.actions}>
          <Pressable onPress={copyText} style={styles.primaryAction}>
            <Text style={styles.primaryActionText}>
              {copied ? "Copied" : "Copy Text"}
            </Text>
          </Pressable>
          <Pressable onPress={saveRecording} style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>Save</Text>
          </Pressable>
          <Pressable onPress={shareText} style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>Share</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.connectCard}>
        <Text style={styles.connectTitle}>Use in other apps</Text>
        <Text style={styles.connectBody}>
          Enable VoiceNote Keyboard to type by voice in WhatsApp, Instagram,
          Gmail, and more.
        </Text>
        <Pressable onPress={openKeyboardSettings} style={styles.connectBtn}>
          <Text style={styles.connectBtnText}>Enable Keyboard</Text>
        </Pressable>
      </View>

      <Text style={styles.tip}>
        Tip: Speak clearly in a quiet environment. Supported: English, Urdu,
        Hindi + more.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 28 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoMark: { width: 28, height: 28, borderRadius: 8 },
  brand: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 22,
    color: colors.text,
  },
  profileChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.purpleDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  profileText: {
    color: colors.white,
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
  },
  hero: {
    marginTop: 22,
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 32,
    lineHeight: 40,
    color: colors.text,
  },
  heroAccent: { color: colors.purpleBright },
  heroSub: {
    marginTop: 8,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: colors.textMuted,
  },
  langBtn: {
    marginTop: 16,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  langBtnText: {
    fontFamily: "DMSans_500Medium",
    color: colors.text,
    fontSize: 14,
  },
  langChevron: { color: colors.textMuted },
  langMenu: {
    marginTop: 8,
    backgroundColor: colors.panel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    alignSelf: "flex-start",
    minWidth: 160,
  },
  langItem: { paddingHorizontal: 14, paddingVertical: 12 },
  langItemText: {
    fontFamily: "DMSans_400Regular",
    color: colors.textMuted,
  },
  langItemOn: {
    color: colors.purpleBright,
    fontFamily: "DMSans_700Bold",
  },
  recordPanel: {
    marginTop: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 14,
  },
  timerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textDim,
  },
  liveDotOn: { backgroundColor: colors.red },
  timer: {
    fontFamily: "Outfit_700Bold",
    color: colors.text,
    fontSize: 16,
    letterSpacing: 1,
  },
  recLabel: {
    fontFamily: "DMSans_500Medium",
    color: colors.textMuted,
    fontSize: 13,
  },
  micHint: {
    fontFamily: "DMSans_400Regular",
    color: colors.textMuted,
    fontSize: 13,
  },
  transcriptPanel: {
    marginTop: 18,
    backgroundColor: colors.panel,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    minHeight: 210,
  },
  transcriptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  transcriptTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  transcriptTitle: {
    fontFamily: "Outfit_700Bold",
    color: colors.text,
    fontSize: 16,
  },
  liveBadge: {
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveBadgeText: {
    color: colors.green,
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
  },
  clearText: {
    color: colors.textMuted,
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
  transcriptScroll: { maxHeight: 160 },
  transcriptBody: {
    fontFamily: "DMSans_400Regular",
    color: colors.text,
    fontSize: 16,
    lineHeight: 26,
  },
  placeholder: { color: colors.textDim },
  caret: { color: colors.purpleBright },
  error: {
    marginTop: 10,
    color: colors.red,
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
  actions: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  primaryAction: {
    backgroundColor: colors.purple,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryActionText: {
    color: colors.white,
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
  },
  secondaryAction: {
    backgroundColor: colors.panelSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  secondaryActionText: {
    color: colors.text,
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
  },
  connectCard: {
    marginTop: 16,
    backgroundColor: "#1A1430",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 16,
  },
  connectTitle: {
    fontFamily: "Outfit_700Bold",
    color: colors.text,
    fontSize: 15,
  },
  connectBody: {
    marginTop: 6,
    fontFamily: "DMSans_400Regular",
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  connectBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: colors.purple,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  connectBtnText: {
    color: colors.white,
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
  },
  tip: {
    marginTop: 16,
    fontFamily: "DMSans_400Regular",
    color: colors.textDim,
    fontSize: 12,
    lineHeight: 18,
  },
});
