import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import type { LangCode } from "../types";

export function useLiveSpeech(lang: LangCode) {
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [liveText, setLiveText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const finalTextRef = useRef("");
  const wantListeningRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  const clearTimers = useCallback(() => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    restartTimerRef.current = null;
    tickRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      clearTimers();
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // ignore
      }
    };
  }, [clearTimers]);

  useSpeechRecognitionEvent("start", () => {
    setListening(true);
    setErrorMessage(null);
  });

  useSpeechRecognitionEvent("end", () => {
    setLiveText("");
    if (wantListeningRef.current) {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      restartTimerRef.current = setTimeout(() => {
        if (!wantListeningRef.current) return;
        try {
          beginRecognition();
        } catch {
          wantListeningRef.current = false;
          setListening(false);
          clearTimers();
        }
      }, 250);
      return;
    }
    setListening(false);
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
    clearTimers();
    setErrorMessage(event.message || event.error);
  });

  const startListening = useCallback(async () => {
    setErrorMessage(null);
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
      setElapsedSec(0);
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = setInterval(() => {
        setElapsedSec((s) => s + 1);
      }, 1000);
      beginRecognition();
    } catch (err) {
      wantListeningRef.current = false;
      setListening(false);
      clearTimers();
      setErrorMessage(
        err instanceof Error ? err.message : "Could not start voice capture."
      );
    }
  }, [beginRecognition, clearTimers]);

  const stopListening = useCallback(() => {
    wantListeningRef.current = false;
    clearTimers();
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // ignore
    }
    setListening(false);
    setLiveText("");
  }, [clearTimers]);

  const toggle = useCallback(() => {
    if (listening || wantListeningRef.current) stopListening();
    else void startListening();
  }, [listening, startListening, stopListening]);

  const clearText = useCallback(() => {
    wantListeningRef.current = false;
    clearTimers();
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
    setElapsedSec(0);
  }, [clearTimers]);

  const message = [finalText, liveText].filter(Boolean).join(" ").trim();

  return {
    listening,
    finalText,
    liveText,
    message,
    errorMessage,
    elapsedSec,
    toggle,
    clearText,
    stopListening,
  };
}

export function formatTimer(totalSec: number) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
