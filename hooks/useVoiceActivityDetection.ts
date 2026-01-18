"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface VADConfig {
  silenceThreshold: number; // Audio level below this = silence (0-1, default 0.01)
  speechThreshold: number; // Audio level above this = speech (0-1, default 0.02)
  silenceDelay: number; // ms of silence before marking as not speaking (default 500)
}

const DEFAULT_CONFIG: VADConfig = {
  silenceThreshold: 0.01,
  speechThreshold: 0.02,
  silenceDelay: 500,
};

export interface UseVADReturn {
  isSpeaking: boolean;
  audioLevel: number;
  isListening: boolean;
  silenceDuration: number;
  startListening: () => Promise<void>;
  stopListening: () => void;
  error: Error | null;
}

export function useVoiceActivityDetection(
  config: Partial<VADConfig> = {}
): UseVADReturn {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [silenceDuration, setSilenceDuration] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastSpeechTimeRef = useRef<number>(Date.now());
  const silenceStartRef = useRef<number>(Date.now());

  const processAudio = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // Calculate RMS (root mean square) for audio level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = dataArray[i] / 255;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    setAudioLevel(rms);

    const now = Date.now();

    // Detect speech based on audio level
    if (rms > cfg.speechThreshold) {
      lastSpeechTimeRef.current = now;
      silenceStartRef.current = now;
      setIsSpeaking(true);
      setSilenceDuration(0);
    } else if (rms < cfg.silenceThreshold) {
      const timeSinceSpeech = now - lastSpeechTimeRef.current;
      if (timeSinceSpeech > cfg.silenceDelay) {
        setIsSpeaking(false);
      }
      const silenceTime = (now - silenceStartRef.current) / 1000;
      setSilenceDuration(silenceTime);
    }

    animationFrameRef.current = requestAnimationFrame(processAudio);
  }, [cfg.silenceThreshold, cfg.speechThreshold, cfg.silenceDelay]);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      console.log("VAD: Starting voice activity detection...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      console.log("VAD: Got microphone access");

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      console.log("VAD: Audio analyser created");

      silenceStartRef.current = Date.now();
      lastSpeechTimeRef.current = Date.now();
      setIsListening(true);

      // Start processing
      animationFrameRef.current = requestAnimationFrame(processAudio);
      console.log("VAD: Started listening");
    } catch (err) {
      console.error("VAD: Error starting:", err);
      setError(err instanceof Error ? err : new Error("Failed to start VAD"));
    }
  }, [processAudio]);

  const stopListening = useCallback(() => {
    console.log("VAD: Stopping...");

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setIsListening(false);
    setIsSpeaking(false);
    setAudioLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isSpeaking,
    audioLevel,
    isListening,
    silenceDuration,
    startListening,
    stopListening,
    error,
  };
}
