// hooks/useElevenLabsVoice.ts
"use client";

import { useRef, useCallback } from "react";

const DEBOUNCE_MS = 15_000; // Don't replay the same alert within 15s

export function useElevenLabsVoice() {
  const lastPlayedRef = useRef<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string, alertKey?: string) => {
    const key = alertKey || text;
    const now = Date.now();

    // Debounce: skip if the same alert was played recently
    if (lastPlayedRef.current[key] && now - lastPlayedRef.current[key] < DEBOUNCE_MS) {
      console.log("[Voice] Skipping duplicate alert:", key);
      return;
    }

    lastPlayedRef.current[key] = now;

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        console.error("[Voice] TTS API returned", response.status);
        // Fallback to browser TTS
        fallbackSpeak(text);
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.volume = 1.0;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      await audio.play();
      console.log("[Voice] Playing ElevenLabs TTS for:", text);
    } catch (err) {
      console.error("[Voice] Failed to play TTS:", err);
      fallbackSpeak(text);
    }
  }, []);

  return { speak };
}

/** Browser-native SpeechSynthesis fallback */
function fallbackSpeak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  window.speechSynthesis.speak(utterance);
  console.log("[Voice] Using browser fallback TTS");
}
