import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts, Outfit_700Bold, Outfit_800ExtraBold } from "@expo-google-fonts/outfit";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import * as Clipboard from "expo-clipboard";
import * as IntentLauncher from "expo-intent-launcher";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

type LangCode = "en-US" | "hi-IN" | "ur-PK";

const LANGUAGES: { code: LangCode; label: string }[] = [
  { code: "en-US", label: "English" },
  { code: "hi-IN", label: "Hindi" },
  { code: "ur-PK", label: "Urdu" },
];

const { width: SCREEN_W } = Dimensions.get("window");

function WaveBars({ active }: { active: boolean }) {
  const bars = useRef(
    [0, 1, 2, 3, 4, 5, 6].map(() => new Animated.Value(0.35))
  ).current;

  useEffect(() => {
    if (!active) {
      bars.forEach((b) => b.setValue(0.35));
      return;
    }
    const anims = bars.map((bar, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: 0.3 + ((i * 17) % 70) / 100,
            duration: 280 + i * 40,
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.95 - ((i * 13) % 40) / 100,
            duration: 320 + i * 35,
            useNativeDriver: true,
          }),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [active, bars]);

  return (
    <View style={styles.waveRow} accessibilityElementsHidden>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[
            styles.waveBar,
            {
              transform: [{ scaleY: bar }],
              opacity: active ? 1 : 0.35,
              backgroundColor: active ? "#0D9488" : "#94A3B8",
            },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * VoiceNote — designed UI + live speech-to-text
 */
export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_700Bold,
    Outfit_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [liveText, setLiveText] = useState("");
  const [lang, setLang] = useState<LangCode>("en-US");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("Ready");

  const finalTextRef = useRef("");
  const wantListeningRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const langRef = useRef(lang);
  langRef.current = lang;

  const beginRecognition = useCallback(() => {
    ExpoSpeechRecognitionModule.start({
      lang: langRef.current,
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      maxAlternatives: 1,
    });
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 550,
      useNativeDriver: true,
    }).start();
  }, [fontsLoaded, fadeIn]);

  useEffect(() => {
    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      wantListeningRef.current = false;
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    if (!listening) {
      pulse.setValue(1);
      ring.setValue(0);
      return;
    }
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );
    const ringLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ring, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(ring, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    ringLoop.start();
    return () => {
      pulseLoop.stop();
      ringLoop.stop();
    };
  }, [listening, pulse, ring]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [finalText, liveText]);

  useSpeechRecognitionEvent("start", () => {
    setListening(true);
    setStatus("Listening");
    setErrorMessage(null);
  });

  useSpeechRecognitionEvent("end", () => {
    setLiveText("");
    if (wantListeningRef.current) {
      setStatus("Continuing");
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        if (!wantListeningRef.current) return;
        try {
          beginRecognition();
        } catch {
          wantListeningRef.current = false;
          setListening(false);
          setStatus("Ready");
        }
      }, 250);
      return;
    }
    setListening(false);
    setStatus("Ready");
  });

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript?.trim() ?? "";
    if (!transcript) return;

    if (event.isFinal) {
      const next = finalTextRef.current
        ? `${finalTextRef.current} ${transcript}`
        : transcript;
      finalTextRef.current = next;
      setFinalText(next);
      setLiveText("");
    } else {
      setLiveText(transcript);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (event.error === "no-speech" || event.error === "aborted") return;
    wantListeningRef.current = false;
    setListening(false);
    setStatus("Ready");
    setErrorMessage(event.message || event.error);
  });

  const startListening = useCallback(async () => {
    setErrorMessage(null);
    setCopied(false);
    try {
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        setErrorMessage(
          "Speech recognition needs a phone build: npx expo run:android"
        );
        return;
      }
      const permission =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Allow microphone and speech recognition for live voice typing."
        );
        return;
      }
      wantListeningRef.current = true;
      setStatus("Starting");
      beginRecognition();
    } catch (err) {
      wantListeningRef.current = false;
      setListening(false);
      setStatus("Ready");
      setErrorMessage(
        err instanceof Error ? err.message : "Could not start voice capture."
      );
    }
  }, [beginRecognition]);

  const stopListening = useCallback(() => {
    wantListeningRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // ignore
    }
    setListening(false);
    setLiveText("");
    setStatus("Ready");
  }, []);

  const onMicPress = useCallback(() => {
    if (listening || wantListeningRef.current) stopListening();
    else void startListening();
  }, [listening, startListening, stopListening]);

  const clearMessage = useCallback(() => {
    wantListeningRef.current = false;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      // ignore
    }
    finalTextRef.current = "";
    setFinalText("");
    setLiveText("");
    setErrorMessage(null);
    setListening(false);
    setCopied(false);
    setStatus("Ready");
  }, []);

  const copyMessage = useCallback(async () => {
    const text = [finalText, liveText].filter(Boolean).join(" ").trim();
    if (!text) {
      Alert.alert("Nothing to copy", "Speak first, then copy your message.");
      return;
    }
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [finalText, liveText]);

  const shareToAnyApp = useCallback(async () => {
    const text = [finalText, liveText].filter(Boolean).join(" ").trim();
    if (!text) {
      Alert.alert(
        "Nothing to send",
        "Speak a message first, then send it to WhatsApp, Instagram, Gmail, or any app."
      );
      return;
    }
    try {
      await Share.share({
        message: text,
        title: "VoiceNote message",
      });
    } catch {
      setErrorMessage("Could not open share menu.");
    }
  }, [finalText, liveText]);

  const openKeyboardSettings = useCallback(async () => {
    if (Platform.OS !== "android") {
      Alert.alert(
        "Android only",
        "VoiceNote Keyboard (system keyboard) works on Android so you can type by voice inside other apps."
      );
      return;
    }
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.INPUT_METHOD_SETTINGS
      );
    } catch {
      Alert.alert(
        "Open settings manually",
        "Go to Settings → System → Languages & input → On-screen keyboard → Enable VoiceNote Keyboard."
      );
    }
  }, []);

  const showConnectHelp = useCallback(() => {
    Alert.alert(
      "Connect to other apps",
      Platform.OS === "android"
        ? "1) Tap Enable Keyboard and turn ON VoiceNote Keyboard\n2) Open WhatsApp / Instagram / any app\n3) Tap a text box → switch keyboard to VoiceNote\n4) Speak — text types there live\n\nOr use Send to app / Copy from this screen."
        : "On Android phone builds you can enable VoiceNote Keyboard to type into any app. On this preview, use Copy or Send to app."
    );
  }, []);

  const message =
    [finalText, liveText].filter(Boolean).join(" ").trim() ||
    "Tap the button and start speaking. Your words will appear here as you talk.";

  const hasText = Boolean(finalText || liveText);
  const ringScale = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.45],
  });
  const ringOpacity = ring.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0],
  });

  if (!fontsLoaded) {
    return <View style={styles.boot} />;
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={["#E8F1F5", "#F3F6F4", "#DDE8E4"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      {/* soft atmosphere shapes */}
      <View style={styles.orbA} />
      <View style={styles.orbB} />

      <Animated.View style={[styles.safe, { opacity: fadeIn }]}>
        <View style={styles.top}>
          <Text style={styles.brand}>VoiceNote</Text>
          <Text style={styles.subtitle}>
            Your voice becomes a message — live, as you speak.
          </Text>
        </View>

        <View style={styles.langRow}>
          {LANGUAGES.map((item) => {
            const selected = item.code === lang;
            return (
              <Pressable
                key={item.code}
                disabled={listening}
                onPress={() => setLang(item.code)}
                style={[styles.langTab, listening && styles.disabled]}
              >
                <Text
                  style={[
                    styles.langTabText,
                    selected && styles.langTabTextOn,
                  ]}
                >
                  {item.label}
                </Text>
                <View
                  style={[styles.langUnderline, selected && styles.langUnderlineOn]}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.stage}>
          <View style={styles.stageHeader}>
            <Text style={styles.stageLabel}>Message</Text>
            <Text style={[styles.stageStatus, listening && styles.stageStatusLive]}>
              {status}
            </Text>
          </View>

          <WaveBars active={listening} />

          <ScrollView
            ref={scrollRef}
            style={styles.stageScroll}
            contentContainerStyle={styles.stageScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.stageText, !hasText && styles.stagePlaceholder]}>
              {message}
            </Text>
            {!!liveText && hasText ? (
              <Text style={styles.liveHint}>Writing live…</Text>
            ) : null}
          </ScrollView>
        </View>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        <View style={styles.micWrap}>
          {listening ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.micRing,
                { opacity: ringOpacity, transform: [{ scale: ringScale }] },
              ]}
            />
          ) : null}
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Pressable
              onPress={onMicPress}
              style={({ pressed }) => [
                styles.mic,
                listening && styles.micOn,
                pressed && styles.micPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={listening ? "Stop listening" : "Start listening"}
            >
              <View style={[styles.micGlyph, listening && styles.micGlyphOn]} />
              <Text style={styles.micText}>{listening ? "STOP" : "START"}</Text>
            </Pressable>
          </Animated.View>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={shareToAnyApp} hitSlop={8} style={styles.primaryLink}>
            <Text style={styles.primaryLinkText}>Send to any app</Text>
          </Pressable>
        </View>

        <View style={styles.connectBox}>
          <Text style={styles.connectTitle}>Use in WhatsApp & more</Text>
          <Text style={styles.connectBody}>
            Enable VoiceNote Keyboard to type by voice inside almost any app.
          </Text>
          <View style={styles.connectRow}>
            <Pressable onPress={openKeyboardSettings} style={styles.connectBtn}>
              <Text style={styles.connectBtnText}>Enable Keyboard</Text>
            </Pressable>
            <Pressable onPress={showConnectHelp} style={styles.connectBtnGhost}>
              <Text style={styles.connectBtnGhostText}>How?</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable onPress={copyMessage} hitSlop={8}>
            <Text style={styles.actionText}>
              {copied ? "Copied" : "Copy"}
            </Text>
          </Pressable>
          <Text style={styles.actionDot}>·</Text>
          <Pressable onPress={clearMessage} hitSlop={8}>
            <Text style={styles.actionText}>Clear</Text>
          </Pressable>
        </View>

        <Text style={styles.note}>
          {Platform.OS === "web"
            ? "Preview mode — full live voice on phone: npx expo run:android"
            : "Build with npx expo run:android for live speech recognition"}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: "#E8F1F5",
  },
  root: {
    flex: 1,
    backgroundColor: "#E8F1F5",
  },
  orbA: {
    position: "absolute",
    top: -SCREEN_W * 0.25,
    right: -SCREEN_W * 0.2,
    width: SCREEN_W * 0.7,
    height: SCREEN_W * 0.7,
    borderRadius: SCREEN_W,
    backgroundColor: "rgba(13, 148, 136, 0.10)",
  },
  orbB: {
    position: "absolute",
    bottom: SCREEN_W * 0.05,
    left: -SCREEN_W * 0.3,
    width: SCREEN_W * 0.75,
    height: SCREEN_W * 0.75,
    borderRadius: SCREEN_W,
    backgroundColor: "rgba(30, 64, 84, 0.08)",
  },
  safe: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight ?? 18) + 8 : 54,
    paddingHorizontal: 24,
    paddingBottom: 22,
  },
  top: {
    marginBottom: 8,
  },
  brand: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 44,
    color: "#0F2740",
    letterSpacing: -1.2,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    lineHeight: 24,
    color: "#4A667A",
    maxWidth: 320,
  },
  langRow: {
    flexDirection: "row",
    gap: 18,
    marginTop: 18,
    marginBottom: 14,
  },
  langTab: {
    paddingBottom: 4,
  },
  langTabText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: "#7B93A4",
  },
  langTabTextOn: {
    fontFamily: "DMSans_700Bold",
    color: "#0F2740",
  },
  langUnderline: {
    marginTop: 6,
    height: 2,
    width: "100%",
    backgroundColor: "transparent",
  },
  langUnderlineOn: {
    backgroundColor: "#0D9488",
  },
  disabled: {
    opacity: 0.45,
  },
  stage: {
    flex: 1,
    minHeight: 210,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(15, 39, 64, 0.12)",
    paddingTop: 14,
    paddingBottom: 12,
  },
  stageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  stageLabel: {
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: "#6B8496",
  },
  stageStatus: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#6B8496",
  },
  stageStatusLive: {
    color: "#0D9488",
  },
  waveRow: {
    height: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginBottom: 12,
  },
  waveBar: {
    width: 4,
    height: 24,
    borderRadius: 2,
  },
  stageScroll: {
    flex: 1,
  },
  stageScrollContent: {
    paddingBottom: 6,
  },
  stageText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 22,
    lineHeight: 34,
    color: "#0F2740",
  },
  stagePlaceholder: {
    color: "#8AA0B0",
  },
  liveHint: {
    marginTop: 10,
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#0D9488",
  },
  error: {
    marginTop: 10,
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#B42318",
  },
  micWrap: {
    marginTop: 22,
    alignItems: "center",
    justifyContent: "center",
    height: 180,
  },
  micRing: {
    position: "absolute",
    width: 156,
    height: 156,
    borderRadius: 78,
    borderWidth: 2,
    borderColor: "#0D9488",
  },
  mic: {
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: "#0F2740",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  micOn: {
    backgroundColor: "#0D9488",
  },
  micPressed: {
    opacity: 0.92,
  },
  micGlyph: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E8F1F5",
  },
  micGlyphOn: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  micText: {
    fontFamily: "Outfit_700Bold",
    color: "#E8F1F5",
    fontSize: 16,
    letterSpacing: 2,
  },
  actions: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  primaryLink: {
    marginTop: 4,
    paddingVertical: 6,
  },
  primaryLinkText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    color: "#0D9488",
    textDecorationLine: "underline",
  },
  connectBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(15, 39, 64, 0.10)",
  },
  connectTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: "#0F2740",
  },
  connectBody: {
    marginTop: 4,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    lineHeight: 19,
    color: "#4A667A",
  },
  connectRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  connectBtn: {
    backgroundColor: "#0F2740",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  connectBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: "#E8F1F5",
  },
  connectBtnGhost: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  connectBtnGhostText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#4A667A",
    textDecorationLine: "underline",
  },
  actionText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    color: "#4A667A",
    textDecorationLine: "underline",
    textDecorationColor: "rgba(74, 102, 122, 0.45)",
  },
  actionDot: {
    fontFamily: "DMSans_400Regular",
    color: "#9BB0BF",
    fontSize: 18,
  },
  note: {
    marginTop: 14,
    textAlign: "center",
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: "#7B93A4",
  },
});
