"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { DeepgramConnection, createAudioProcessor } from "@/lib/deepgram";
import { RollingTranscriptBuffer } from "@/lib/transcriptBuffer";
import { TranscriptSegment } from "@/types/transcript";

export interface WingmanTranscriptionState {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  currentTranscript: string;
  recentTranscript: string;
  fillerRate: number;
  fillerCount: number;
  silenceDuration: number;
  error: Error | null;
}

export interface UseWingmanTranscriptionReturn extends WingmanTranscriptionState {
  startListening: () => Promise<void>;
  stopListening: () => void;
  getTranscriptBuffer: () => RollingTranscriptBuffer;
  addPartnerSegment: (text: string, startTime: number, endTime: number) => void;
}

export function useWingmanTranscription(): UseWingmanTranscriptionReturn {
  const [state, setState] = useState<WingmanTranscriptionState>({
    isConnected: false,
    isListening: false,
    isSpeaking: false,
    currentTranscript: "",
    recentTranscript: "",
    fillerRate: 0,
    fillerCount: 0,
    silenceDuration: 0,
    error: null,
  });

  const connectionRef = useRef<DeepgramConnection | null>(null);
  const bufferRef = useRef<RollingTranscriptBuffer>(new RollingTranscriptBuffer());
  const audioProcessorRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastSpeechTimeRef = useRef<number>(Date.now());
  const silenceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track silence duration
  useEffect(() => {
    if (state.isListening && !state.isSpeaking) {
      silenceIntervalRef.current = setInterval(() => {
        const silenceDuration = (Date.now() - lastSpeechTimeRef.current) / 1000;
        setState((prev) => ({ ...prev, silenceDuration }));
      }, 100);
    } else {
      if (silenceIntervalRef.current) {
        clearInterval(silenceIntervalRef.current);
        silenceIntervalRef.current = null;
      }
      if (state.isSpeaking) {
        setState((prev) => ({ ...prev, silenceDuration: 0 }));
      }
    }

    return () => {
      if (silenceIntervalRef.current) {
        clearInterval(silenceIntervalRef.current);
      }
    };
  }, [state.isListening, state.isSpeaking]);

  const startListening = useCallback(async () => {
    try {
      // Get Deepgram token
      const tokenResponse = await fetch("/api/deepgram/token");
      if (!tokenResponse.ok) {
        throw new Error("Failed to get Deepgram token");
      }
      const { token } = await tokenResponse.json();

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      // Create Deepgram connection
      const connection = new DeepgramConnection();
      connectionRef.current = connection;

      // Set up event handlers
      connection.on("open", () => {
        setState((prev) => ({ ...prev, isConnected: true, error: null }));
      });

      connection.on("transcript", (event) => {
        if (event.data && event.data.isValid) {
          bufferRef.current.addSegment(event.data);
          lastSpeechTimeRef.current = Date.now();

          setState((prev) => ({
            ...prev,
            isSpeaking: true,
            currentTranscript: event.data!.text,
            recentTranscript: bufferRef.current.getTranscriptText(),
            fillerRate: bufferRef.current.getUserFillerRate(),
            fillerCount: bufferRef.current.getUserFillerCount(),
            silenceDuration: 0,
          }));

          // Clear speaking state after a short delay
          setTimeout(() => {
            setState((prev) => ({ ...prev, isSpeaking: false }));
          }, 500);
        }
      });

      connection.on("speech_started", () => {
        setState((prev) => ({ ...prev, isSpeaking: true }));
      });

      connection.on("utterance_end", () => {
        lastSpeechTimeRef.current = Date.now();
        setState((prev) => ({ ...prev, isSpeaking: false }));
      });

      connection.on("error", (event) => {
        setState((prev) => ({ ...prev, error: event.error || new Error("Connection error") }));
      });

      connection.on("close", () => {
        setState((prev) => ({ ...prev, isConnected: false }));
      });

      // Connect to Deepgram
      await connection.connect(token);

      // Set up audio processor
      const processor = createAudioProcessor(stream, (audioData) => {
        connection.sendAudio(audioData);
      });
      audioProcessorRef.current = processor;
      processor.start();

      setState((prev) => ({ ...prev, isListening: true }));
    } catch (error) {
      console.error("Error starting transcription:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error("Failed to start transcription"),
      }));
    }
  }, []);

  const stopListening = useCallback(() => {
    // Stop audio processor
    if (audioProcessorRef.current) {
      audioProcessorRef.current.stop();
      audioProcessorRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Close Deepgram connection
    if (connectionRef.current) {
      connectionRef.current.close();
      connectionRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isConnected: false,
      isListening: false,
      isSpeaking: false,
    }));
  }, []);

  const getTranscriptBuffer = useCallback(() => {
    return bufferRef.current;
  }, []);

  const addPartnerSegment = useCallback(
    (text: string, startTime: number, endTime: number) => {
      const segment: TranscriptSegment = {
        id: `partner-${Date.now()}`,
        speaker: "partner",
        text,
        words: [], // Partner words not analyzed for fillers
        startTime,
        endTime,
        confidence: 1.0,
        isValid: true,
        fillerCount: 0,
      };
      bufferRef.current.addSegment(segment);
      setState((prev) => ({
        ...prev,
        recentTranscript: bufferRef.current.getTranscriptText(),
      }));
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    ...state,
    startListening,
    stopListening,
    getTranscriptBuffer,
    addPartnerSegment,
  };
}
