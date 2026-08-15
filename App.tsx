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

/**
 * VoiceNote — rebuilt from scratch
 *
 * Flow:
 * 1. Tap START
 * 2. Speak
 * 3. Words appear LIVE in the message box
 * 4. Tap STOP
 */
export default function App() {
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [liveText, setLiveText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Keeps confirmed words across continuous recognition chunks
  const finalTextRef = useRef("");

  useSpeechRecognitionEvent("start", () => {
    setListening(true);
    setErrorMessage(null);
  });

  useSpeechRecognitionEvent("end", () => {
    setListening(false);
    setLiveText("");
  });

  // This is the live part: interim results stream while you talk
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
    setListening(false);
    setErrorMessage(event.message || event.error);
  });

  const startListening = useCallback(async () => {
    setErrorMessage(null);

    try {
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        setErrorMessage(
          "Speech recognition is not available on this device. Use an Android/iOS phone build."
        );
        return;
      }

      const permission =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Allow microphone + speech recognition so your voice can become text live."
        );
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true, // show text WHILE speaking
        continuous: true, // keep going until STOP
        addsPunctuation: true,
        maxAlternatives: 1,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not start voice capture.";
      setErrorMessage(msg);
      setListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
    setListening(false);
    setLiveText("");
  }, []);

  const onMicPress = useCallback(() => {
    if (listening) stopListening();
    else void startListening();
  }, [listening, startListening, stopListening]);

  const clearMessage = useCallback(() => {
    if (listening) ExpoSpeechRecognitionModule.abort();
    finalTextRef.current = "";
    setFinalText("");
    setLiveText("");
    setErrorMessage(null);
    setListening(false);
  }, [listening]);

  const message =
    [finalText, liveText].filter(Boolean).join(" ").trim() ||
    "Tap START and speak. Your words will appear here live.";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <Text style={styles.brand}>VoiceNote</Text>
        <Text style={styles.subtitle}>
          Speak → words appear instantly in your message
        </Text>

        <View style={styles.messageBox}>
          <Text style={styles.messageLabel}>MESSAGE</Text>
          <ScrollView style={styles.messageScroll}>
            <Text
              style={[
                styles.messageText,
                !finalText && !liveText && styles.placeholder,
              ]}
            >
              {message}
            </Text>
          </ScrollView>
          {listening ? (
            <Text style={styles.listening}>Listening… keep talking</Text>
          ) : null}
        </View>

        {errorMessage ? (
          <Text style={styles.error}>{errorMessage}</Text>
        ) : null}

        <Pressable
          onPress={onMicPress}
          style={({ pressed }) => [
            styles.mic,
            listening && styles.micOn,
            pressed && styles.micPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={listening ? "Stop" : "Start"}
        >
          <View style={[styles.micDot, listening && styles.micDotOn]} />
          <Text style={styles.micText}>{listening ? "STOP" : "START"}</Text>
        </Pressable>

        <Pressable onPress={clearMessage} style={styles.clearBtn}>
          <Text style={styles.clearText}>Clear message</Text>
        </Pressable>

        <Text style={styles.note}>
          {Platform.OS === "web"
            ? "Web preview: UI only. Real live voice works best on a phone build."
            : "On phone: use a development build (npx expo run:android), not Expo Go alone."}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F7F4EF",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
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
  messageBox: {
    flex: 1,
    marginTop: 24,
    minHeight: 220,
    borderWidth: 1.5,
    borderColor: "#BCCCDC",
    backgroundColor: "#FFFCF8",
    padding: 16,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#829AB1",
    marginBottom: 10,
  },
  messageScroll: {
    flex: 1,
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
    marginTop: 22,
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
    transform: [{ scale: 0.98 }],
  },
  micDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#F7F4EF",
  },
  micDotOn: {
    width: 14,
    height: 14,
    borderRadius: 2,
  },
  micText: {
    color: "#F7F4EF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  clearBtn: {
    marginTop: 18,
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  clearText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#486581",
    textDecorationLine: "underline",
  },
  note: {
    marginTop: 14,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    color: "#829AB1",
  },
});
