// hooks/useElevenLabsVoice.ts
"use client";

import { useRef, useCallback, useEffect } from "react";

const DEBOUNCE_MS = 15_000; // Don't replay the same alert within 15s

export function useElevenLabsVoice() {
  const lastPlayedRef = useRef<Record<string, number>>({});
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Pre-load voices so we can choose a good one
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        voicesRef.current = availableVoices;
      }
    };

    if (typeof window !== "undefined" && window.speechSynthesis) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speak = useCallback((text: string, alertKey?: string, lang: string = "en-IN") => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const key = alertKey || text;
    const now = Date.now();

    // Debounce: skip if the same alert was played recently
    if (lastPlayedRef.current[key] && now - lastPlayedRef.current[key] < DEBOUNCE_MS) {
      console.log("[Voice] Skipping duplicate alert:", key);
      return;
    }

    lastPlayedRef.current[key] = now;

    try {
      // Cancel any currently playing speech to avoid overlap
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang; // Explicitly set to requested language
      
      // Try to select an appropriate voice based on requested language
      if (voicesRef.current.length > 0) {
        const preferredVoice = voicesRef.current.find(
          (voice) => 
            (voice.lang === lang || voice.lang.startsWith(lang.split('-')[0])) &&
            (voice.name.includes("Google") || voice.name.includes("Natural")) &&
            !voice.localService
        ) || voicesRef.current.find(v => v.lang.startsWith(lang.split('-')[0]));
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }

      utterance.rate = 1.0;  // Normal speed
      utterance.pitch = 1.0; // Normal pitch
      utterance.volume = 1.0;

      window.speechSynthesis.speak(utterance);
      console.log("[Voice] Playing native TTS for:", text);

    } catch (err) {
      console.error("[Voice] Failed to play TTS:", err);
    }
  }, []);

  return { speak };
}
