"use client";

import { useCallback, useRef } from "react";

export type CueType = "warning" | "alert" | "gentle" | "filler";

interface AudioCueConfig {
  frequency: number;  // Hz
  duration: number;   // ms
  volume: number;     // 0-1
  type: OscillatorType;
  secondFrequency?: number; // For two-tone sounds
}

const CUE_PRESETS: Record<CueType, AudioCueConfig> = {
  gentle: {
    frequency: 440,    // A4 note - soft and pleasant
    duration: 100,
    volume: 0.15,
    type: "sine",
  },
  warning: {
    frequency: 880,    // A5 note - higher and more urgent
    duration: 120,
    volume: 0.4,
    type: "square",
  },
  alert: {
    frequency: 600,    // Higher pitch for attention
    duration: 200,
    volume: 0.25,
    type: "triangle",
  },
  filler: {
    frequency: 1200,   // High sharp ping
    duration: 80,
    volume: 0.45,
    type: "square",
    secondFrequency: 900, // Descending tone for warning feel
  },
};

export function useAudioCue() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastPlayTimeRef = useRef<number>(0);
  const cooldownMs = 3000; // Don't play more than once every 3 seconds

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const playCue = useCallback(
    (cueType: CueType = "gentle") => {
      const now = Date.now();

      // Respect cooldown
      if (now - lastPlayTimeRef.current < cooldownMs) {
        return;
      }
      lastPlayTimeRef.current = now;

      try {
        const ctx = getAudioContext();
        const config = CUE_PRESETS[cueType];

        // Create oscillator for the tone
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = config.type;
        oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime);

        // Envelope: quick fade in, hold, fade out (prevents clicks)
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(
          config.volume,
          ctx.currentTime + 0.01
        );
        gainNode.gain.setValueAtTime(
          config.volume,
          ctx.currentTime + config.duration / 1000 - 0.05
        );
        gainNode.gain.linearRampToValueAtTime(
          0,
          ctx.currentTime + config.duration / 1000
        );

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + config.duration / 1000);

        console.log(`🔔 Audio cue played: ${cueType}`);
      } catch (err) {
        console.error("Failed to play audio cue:", err);
      }
    },
    [getAudioContext]
  );

  // Play a double beep for more urgent alerts
  const playDoubleBeep = useCallback(
    (cueType: CueType = "warning") => {
      const now = Date.now();

      if (now - lastPlayTimeRef.current < cooldownMs) {
        return;
      }
      lastPlayTimeRef.current = now;

      try {
        const ctx = getAudioContext();
        const config = CUE_PRESETS[cueType];

        // First beep
        for (let i = 0; i < 2; i++) {
          const delay = i * 0.15; // 150ms between beeps

          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();

          oscillator.type = config.type;
          oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime + delay);

          gainNode.gain.setValueAtTime(0, ctx.currentTime + delay);
          gainNode.gain.linearRampToValueAtTime(
            config.volume,
            ctx.currentTime + delay + 0.01
          );
          gainNode.gain.linearRampToValueAtTime(
            0,
            ctx.currentTime + delay + 0.08
          );

          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);

          oscillator.start(ctx.currentTime + delay);
          oscillator.stop(ctx.currentTime + delay + 0.1);
        }

        console.log(`🔔🔔 Double beep played: ${cueType}`);
      } catch (err) {
        console.error("Failed to play double beep:", err);
      }
    },
    [getAudioContext]
  );

  // Play a sharp descending warning ping for filler words
  const playFillerWarning = useCallback(
    () => {
      const now = Date.now();

      if (now - lastPlayTimeRef.current < cooldownMs) {
        return;
      }
      lastPlayTimeRef.current = now;

      try {
        const ctx = getAudioContext();
        const config = CUE_PRESETS.filler;

        // First tone (high)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = config.type;
        osc1.frequency.setValueAtTime(config.frequency, ctx.currentTime);

        gain1.gain.setValueAtTime(0, ctx.currentTime);
        gain1.gain.linearRampToValueAtTime(config.volume, ctx.currentTime + 0.005);
        gain1.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.08);

        // Second tone (lower) - descending effect
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = config.type;
        osc2.frequency.setValueAtTime(config.secondFrequency || 900, ctx.currentTime + 0.1);

        gain2.gain.setValueAtTime(0, ctx.currentTime + 0.1);
        gain2.gain.linearRampToValueAtTime(config.volume * 0.8, ctx.currentTime + 0.105);
        gain2.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.1);
        osc2.stop(ctx.currentTime + 0.2);

        console.log("⚠️ Filler warning ping played");
      } catch (err) {
        console.error("Failed to play filler warning:", err);
      }
    },
    [getAudioContext]
  );

  return {
    playCue,
    playDoubleBeep,
    playFillerWarning,
  };
}
