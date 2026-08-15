import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
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

/**
 * VoiceNote
 * START → speak → words appear LIVE → STOP
 */
export default function App() {
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
    return () => {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      wantListeningRef.current = false;
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // ignore cleanup errors
      }
    };
  }, []);

  useEffect(() => {
    if (!listening) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.08,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [listening, pulse]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [finalText, liveText]);

  useSpeechRecognitionEvent("start", () => {
    setListening(true);
    setStatus("Listening…");
    setErrorMessage(null);
  });

  useSpeechRecognitionEvent("end", () => {
    setLiveText("");
    // Android may end a session early; keep going if user still wants listening
    if (wantListeningRef.current) {
      setStatus("Continuing…");
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
          "Speech recognition is not available here. Run a phone build: npx expo run:android"
        );
        return;
      }

      const permission =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Allow microphone and speech recognition so VoiceNote can write your words live."
        );
        return;
      }

      wantListeningRef.current = true;
      setStatus("Starting…");
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
      // ignore stop errors when already stopped
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

  const message =
    [finalText, liveText].filter(Boolean).join(" ").trim() ||
    "Tap START and speak. Your words will appear here live.";

  const hasText = Boolean(finalText || liveText);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#EEF3F7" />
      <View style={styles.container}>
        <Text style={styles.brand}>VoiceNote</Text>
        <Text style={styles.subtitle}>
          Speak and watch your message write itself live
        </Text>

        <View style={styles.langRow}>
          {LANGUAGES.map((item) => {
            const selected = item.code === lang;
            return (
              <Pressable
                key={item.code}
                disabled={listening}
                onPress={() => setLang(item.code)}
                style={[
                  styles.langChip,
                  selected && styles.langChipSelected,
                  listening && styles.disabled,
                ]}
              >
                <Text
                  style={[
                    styles.langChipText,
                    selected && styles.langChipTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.messageBox}>
          <View style={styles.messageHeader}>
            <Text style={styles.messageLabel}>MESSAGE</Text>
            <Text style={styles.status}>{status}</Text>
          </View>
          <ScrollView
            ref={scrollRef}
            style={styles.messageScroll}
            contentContainerStyle={styles.messageScrollContent}
          >
            <Text
              style={[styles.messageText, !hasText && styles.placeholder]}
            >
              {message}
            </Text>
          </ScrollView>
          {listening ? (
            <Text style={styles.listening}>Listening… keep talking</Text>
          ) : null}
        </View>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

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
            <View style={[styles.micDot, listening && styles.micDotOn]} />
            <Text style={styles.micText}>{listening ? "STOP" : "START"}</Text>
          </Pressable>
        </Animated.View>

        <View style={styles.actions}>
          <Pressable onPress={copyMessage} style={styles.actionBtn}>
            <Text style={styles.actionText}>
              {copied ? "Copied" : "Copy message"}
            </Text>
          </Pressable>
          <Pressable onPress={clearMessage} style={styles.actionBtn}>
            <Text style={styles.actionText}>Clear</Text>
          </Pressable>
        </View>

        <Text style={styles.note}>
          {Platform.OS === "web"
            ? "Web shows the UI. For full live voice, build on phone: npx expo run:android"
            : "Use a development build (npx expo run:android). Expo Go alone is not enough."}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#EEF3F7",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  brand: {
    fontFamily: Platform.select({
      ios: "Avenir Next",
      android: "sans-serif-medium",
      default: "system-ui",
    }),
    fontSize: 40,
    fontWeight: "800",
    color: "#102A43",
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 22,
    color: "#486581",
  },
  langRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },
  langChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#9FB3C8",
  },
  langChipSelected: {
    backgroundColor: "#102A43",
    borderColor: "#102A43",
  },
  langChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#243B53",
  },
  langChipTextSelected: {
    color: "#EEF3F7",
  },
  disabled: {
    opacity: 0.5,
  },
  messageBox: {
    flex: 1,
    marginTop: 18,
    minHeight: 200,
    borderWidth: 1.5,
    borderColor: "#9FB3C8",
    backgroundColor: "#F8FBFD",
    padding: 16,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#627D98",
  },
  status: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F7B6C",
  },
  messageScroll: {
    flex: 1,
  },
  messageScrollContent: {
    paddingBottom: 8,
  },
  messageText: {
    fontSize: 20,
    lineHeight: 30,
    color: "#102A43",
  },
  placeholder: {
    color: "#9FB3C8",
  },
  listening: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#0F7B6C",
  },
  error: {
    marginTop: 10,
    color: "#9B1C1C",
    fontSize: 13,
  },
  mic: {
    marginTop: 20,
    alignSelf: "center",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#102A43",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  micOn: {
    backgroundColor: "#0F7B6C",
  },
  micPressed: {
    opacity: 0.92,
  },
  micDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EEF3F7",
  },
  micDotOn: {
    width: 14,
    height: 14,
    borderRadius: 2,
  },
  micText: {
    color: "#EEF3F7",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  actions: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#486581",
    textDecorationLine: "underline",
  },
  note: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    color: "#829AB1",
  },
});
