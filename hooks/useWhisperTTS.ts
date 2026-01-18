"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ElevenLabsClient } from "@/lib/elevenlabs";

export interface UseWhisperTTSOptions {
  volume?: number;
  enabled?: boolean;
  voiceId?: string;
}

export interface UseWhisperTTSReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isEnabled: boolean;
  volume: number;
  setVolume: (volume: number) => void;
  setEnabled: (enabled: boolean) => void;
  error: Error | null;
}

export function useWhisperTTS(
  options: UseWhisperTTSOptions = {}
): UseWhisperTTSReturn {
  const { volume: initialVolume = 0.3, enabled: initialEnabled = true, voiceId } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [volume, setVolumeState] = useState(initialVolume);
  const [error, setError] = useState<Error | null>(null);

  const clientRef = useRef<ElevenLabsClient | null>(null);

  // Initialize client
  useEffect(() => {
    clientRef.current = new ElevenLabsClient(voiceId ? { voiceId } : undefined);
    clientRef.current.setVolume(initialVolume);
  }, [voiceId, initialVolume]);

  // Speak text
  const speak = useCallback(
    async (text: string) => {
      console.log("useWhisperTTS.speak called:", { text, isEnabled, hasClient: !!clientRef.current });

      if (!isEnabled) {
        console.log("TTS disabled, skipping");
        return;
      }

      if (!clientRef.current) {
        console.log("No TTS client, skipping");
        return;
      }

      try {
        setError(null);
        setIsSpeaking(true);
        console.log("Calling speakWhisper...");
        await clientRef.current.speakWhisper(text);
        console.log("speakWhisper completed");
      } catch (err) {
        console.error("TTS error:", err);
        setError(err instanceof Error ? err : new Error("TTS failed"));
      } finally {
        setIsSpeaking(false);
      }
    },
    [isEnabled]
  );

  // Stop speaking
  const stop = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.stopAudio();
      setIsSpeaking(false);
    }
  }, []);

  // Set volume
  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    if (clientRef.current) {
      clientRef.current.setVolume(clampedVolume);
    }
  }, []);

  // Set enabled state
  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    if (!enabled && clientRef.current) {
      clientRef.current.stopAudio();
      setIsSpeaking(false);
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.stopAudio();
      }
    };
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isEnabled,
    volume,
    setVolume,
    setEnabled,
    error,
  };
}
