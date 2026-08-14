import { useCallback, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
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

export default function App() {
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [liveText, setLiveText] = useState("");
  const [lang, setLang] = useState<LangCode>("en-US");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const finalTextRef = useRef("");

  useSpeechRecognitionEvent("start", () => {
    setListening(true);
    setErrorMessage(null);
  });

  useSpeechRecognitionEvent("end", () => {
    setListening(false);
    setLiveText("");
  });

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript?.trim() ?? "";
    if (!transcript) return;

    // Live: show words while speaking (interim)
    // Final: lock confirmed words into the message
    if (event.isFinal) {
      const next =
        finalTextRef.current.length > 0
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
    // "no-speech" is common when mic is open but silent — not a hard failure
    if (event.error === "no-speech" || event.error === "aborted") {
      return;
    }
    setListening(false);
    setErrorMessage(event.message || event.error);
  });

  const startListening = useCallback(async () => {
    setErrorMessage(null);

    const permission =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "Please allow microphone and speech recognition so the app can convert your voice to text live."
      );
      return;
    }

    ExpoSpeechRecognitionModule.start({
      lang,
      interimResults: true, // show text while you speak
      continuous: true, // keep listening until you stop
      addsPunctuation: true,
      maxAlternatives: 1,
    });
  }, [lang]);

  const stopListening = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
    setListening(false);
    setLiveText("");
  }, []);

  const toggleListening = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      void startListening();
    }
  }, [listening, startListening, stopListening]);

  const clearMessage = useCallback(() => {
    if (listening) {
      ExpoSpeechRecognitionModule.abort();
    }
    finalTextRef.current = "";
    setFinalText("");
    setLiveText("");
    setErrorMessage(null);
    setListening(false);
  }, [listening]);

  const messagePreview =
    [finalText, liveText].filter(Boolean).join(" ").trim() ||
    "Press the mic and start speaking… text will appear here live.";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.backdrop} />
      <View style={styles.container}>
        <Text style={styles.brand}>VoiceNote</Text>
        <Text style={styles.subtitle}>
          Speak and see your words appear instantly
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
                  listening && styles.langChipDisabled,
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

        <View style={styles.messageCard}>
          <Text style={styles.messageLabel}>Message</Text>
          <ScrollView
            style={styles.messageScroll}
            contentContainerStyle={styles.messageScrollContent}
          >
            <Text
              style={[
                styles.messageText,
                !finalText && !liveText && styles.messagePlaceholder,
              ]}
            >
              {messagePreview}
            </Text>
          </ScrollView>
          {listening ? (
            <Text style={styles.listeningHint}>Listening… speak now</Text>
          ) : null}
        </View>

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <Pressable
          onPress={toggleListening}
          style={({ pressed }) => [
            styles.micButton,
            listening && styles.micButtonActive,
            pressed && styles.micButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            listening ? "Stop voice capture" : "Start voice capture"
          }
        >
          <View
            style={[styles.micDot, listening && styles.micDotActive]}
          />
          <Text style={styles.micLabel}>
            {listening ? "STOP" : "START"}
          </Text>
        </Pressable>

        <View style={styles.actions}>
          <Pressable onPress={clearMessage} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Clear message</Text>
          </Pressable>
        </View>

        <Text style={styles.footerNote}>
          {Platform.OS === "web"
            ? "On web, use a Chromium browser and allow mic access."
            : "Needs a development build (not Expo Go) for live speech recognition."}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0B1C24",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#0B1C24",
    borderBottomWidth: 180,
    borderBottomColor: "#123041",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  brand: {
    fontFamily: Platform.select({
      ios: "Avenir Next",
      android: "sans-serif-medium",
      default: "system-ui",
    }),
    fontSize: 40,
    fontWeight: "700",
    color: "#E8F2F6",
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 22,
    color: "#9BB4C0",
  },
  langRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
    marginBottom: 16,
  },
  langChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#2F4A58",
    backgroundColor: "transparent",
  },
  langChipSelected: {
    backgroundColor: "#2DD4BF",
    borderColor: "#2DD4BF",
  },
  langChipDisabled: {
    opacity: 0.55,
  },
  langChipText: {
    fontSize: 14,
    color: "#D5E6EE",
    fontWeight: "600",
  },
  langChipTextSelected: {
    color: "#0B1C24",
  },
  messageCard: {
    flex: 1,
    minHeight: 220,
    borderWidth: 1,
    borderColor: "#2F4A58",
    backgroundColor: "rgba(17, 36, 46, 0.92)",
    padding: 16,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#7F9AAB",
    marginBottom: 10,
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
    color: "#E8F2F6",
  },
  messagePlaceholder: {
    color: "#6F8896",
  },
  listeningHint: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#2DD4BF",
  },
  errorText: {
    marginTop: 10,
    color: "#FCA5A5",
    fontSize: 13,
  },
  micButton: {
    marginTop: 20,
    alignSelf: "center",
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: "#2DD4BF",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  micButtonActive: {
    backgroundColor: "#F07167",
  },
  micButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  micDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#0B1C24",
  },
  micDotActive: {
    borderRadius: 3,
    width: 16,
    height: 16,
  },
  micLabel: {
    color: "#0B1C24",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  actions: {
    marginTop: 18,
    alignItems: "center",
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#9BB4C0",
    textDecorationLine: "underline",
  },
  footerNote: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    color: "#6F8896",
  },
});
