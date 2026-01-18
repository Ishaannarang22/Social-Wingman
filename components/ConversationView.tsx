"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import {
  LiveKitRoom,
  useVoiceAssistant,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  useRoomContext,
  useConnectionState,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { VoiceOrb } from "./VoiceOrb";
import { StatusText, ConversationState } from "./StatusText";
import { ListeningIndicator } from "./ListeningIndicator";
import { SuggestionToast } from "./SuggestionToast";
import { DebugInfo } from "./DebugDrawer";
import { cn } from "@/lib/utils";
import { useWingmanTranscription } from "@/hooks/useWingmanTranscription";
import { useSocialBattery } from "@/hooks/useSocialBattery";
import { useWingmanSuggestion } from "@/hooks/useWingmanSuggestion";
import { useWhisperTTS } from "@/hooks/useWhisperTTS";
import { useVoiceActivityDetection } from "@/hooks/useVoiceActivityDetection";
import { useAudioCue } from "@/hooks/useAudioCue";
import { SessionConfig } from "@/hooks/useSession";
import { WingmanSuggestion } from "@/types/analytics";

interface ConversationViewProps {
  config: SessionConfig;
  token: string;
  serverUrl: string;
  onEnd: () => void;
  onBatteryChange?: (value: number) => void;
  onSuggestion?: () => void;
  onFillerUpdate?: (fillerRate: number, fillerCount: number) => void;
  onSpeakingTimeUpdate?: (speakingTime: number, silenceTime: number, longestSilence: number) => void;
  onFillerBreakdownUpdate?: (fillerCounts: Record<string, number>) => void;
}

function ConversationContent({
  config,
  onEnd,
  onBatteryChange,
  onSuggestion,
  onFillerUpdate,
  onSpeakingTimeUpdate,
  onFillerBreakdownUpdate,
}: Omit<ConversationViewProps, "token" | "serverUrl">) {
  const connectionState = useConnectionState();
  const { state: agentState, audioTrack } = useVoiceAssistant();
  const room = useRoomContext();

  const [showSuggestion, setShowSuggestion] = useState<WingmanSuggestion | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize hooks
  const transcription = useWingmanTranscription();
  const vad = useVoiceActivityDetection({
    silenceThreshold: 0.15,
    speechThreshold: 0.16,
    silenceDelay: 300,
  });
  const battery = useSocialBattery({
    onCritical: (value) => {
      console.log("Battery critical:", value);
    },
  });
  const wingman = useWingmanSuggestion({
    eventType: config.eventType,
    userRole: config.userRole,
    onSuggestion: (suggestion) => {
      setShowSuggestion(suggestion);
      onSuggestion?.();
    },
  });
  const whisperTTS = useWhisperTTS();
  const audioCue = useAudioCue();

  const [coherenceIssue, setCoherenceIssue] = useState<string | null>(null);

  // Analytics tracking refs
  const speakingTimeRef = useRef(0);
  const silenceTimeRef = useRef(0);
  const longestSilenceRef = useRef(0);
  const lastUpdateTimeRef = useRef(Date.now());
  const analyticsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Triple-tap to open debug drawer
  const handleBatteryTap = () => {
    setTapCount((prev) => prev + 1);

    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }

    tapTimeoutRef.current = setTimeout(() => {
      if (tapCount >= 2) {
        setShowDebug(true);
      }
      setTapCount(0);
    }, 300);
  };

  // Start VAD and transcription when connected
  useEffect(() => {
    if (connectionState === ConnectionState.Connected) {
      vad.startListening();
      transcription.startListening();
    }

    return () => {
      vad.stopListening();
      transcription.stopListening();
    };
  }, [connectionState]);

  // Battery logic using VAD
  useEffect(() => {
    if (!vad.isListening) return;

    if (vad.isSpeaking) {
      battery.recordSpeech();
    } else if (agentState === "speaking") {
      battery.stopDraining();
    } else {
      battery.startDraining();
    }
  }, [vad.isListening, vad.isSpeaking, agentState]);

  // Apply filler penalty and play audio cues
  const lastFillerThresholdRef = useRef<number>(0);
  const wasSpeakingRef = useRef<boolean>(false);

  // Reset filler threshold when user stops speaking
  useEffect(() => {
    if (wasSpeakingRef.current && !vad.isSpeaking) {
      // User just stopped speaking - reset threshold for next speaking segment
      lastFillerThresholdRef.current = 0;
    }
    wasSpeakingRef.current = vad.isSpeaking;
  }, [vad.isSpeaking]);

  useEffect(() => {
    if (transcription.fillerRate > 0) {
      battery.applyFillerPenalty(transcription.fillerRate);

      const currentThreshold = Math.floor(transcription.fillerRate / 5) * 5;

      if (vad.isSpeaking && currentThreshold > lastFillerThresholdRef.current && currentThreshold >= 5) {
        lastFillerThresholdRef.current = currentThreshold;
        // Play warning ping for filler words
        audioCue.playFillerWarning();
      }
    }
  }, [transcription.fillerRate, vad.isSpeaking]);

  // Coherence check
  const lastCoherenceCheckRef = useRef<number>(0);

  useEffect(() => {
    const checkCoherence = async () => {
      const now = Date.now();
      if (now - lastCoherenceCheckRef.current < 5000) return;

      const transcript = transcription.recentTranscript;
      if (!transcript || transcript.length < 20) return;

      lastCoherenceCheckRef.current = now;

      try {
        const response = await fetch("/api/wingman/coherence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript }),
        });

        if (response.ok) {
          const { score, issue } = await response.json();

          if (score < 0.5) {
            setCoherenceIssue(issue || "Speech unclear");
            battery.applyFillerPenalty(15);
          } else if (score < 0.7) {
            setCoherenceIssue(issue || "Could be clearer");
            battery.applyFillerPenalty(8);
          } else {
            setCoherenceIssue(null);
          }
        }
      } catch (err) {
        console.error("Coherence check failed:", err);
      }
    };

    if (transcription.recentTranscript) {
      checkCoherence();
    }
  }, [transcription.recentTranscript]);

  // Report battery changes
  useEffect(() => {
    onBatteryChange?.(battery.batteryValue);
  }, [battery.batteryValue, onBatteryChange]);

  // Report filler updates
  useEffect(() => {
    onFillerUpdate?.(transcription.fillerRate, transcription.fillerCount);
  }, [transcription.fillerRate, transcription.fillerCount, onFillerUpdate]);

  // Refs for current state (to avoid effect dependencies)
  const vadStateRef = useRef({ isSpeaking: false, silenceDuration: 0 });
  const agentStateRef = useRef(agentState);

  // Update state refs
  useEffect(() => {
    vadStateRef.current = { isSpeaking: vad.isSpeaking, silenceDuration: vad.silenceDuration };
  }, [vad.isSpeaking, vad.silenceDuration]);

  useEffect(() => {
    agentStateRef.current = agentState;
  }, [agentState]);

  // Track speaking time, silence time, and report analytics
  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return;

    // Reset tracking refs when session starts
    speakingTimeRef.current = 0;
    silenceTimeRef.current = 0;
    longestSilenceRef.current = 0;
    lastUpdateTimeRef.current = Date.now();

    // Update times every 100ms
    const interval = setInterval(() => {
      const now = Date.now();
      const delta = (now - lastUpdateTimeRef.current) / 1000;
      lastUpdateTimeRef.current = now;

      const currentVadState = vadStateRef.current;
      const currentAgentState = agentStateRef.current;

      // Track speaking vs silence time
      if (currentVadState.isSpeaking) {
        speakingTimeRef.current += delta;
      } else if (currentAgentState !== "speaking") {
        // Only count silence when neither user nor agent is speaking
        silenceTimeRef.current += delta;
      }

      // Track longest silence
      if (currentVadState.silenceDuration > longestSilenceRef.current) {
        longestSilenceRef.current = currentVadState.silenceDuration;
      }
    }, 100);

    // Report analytics every second
    analyticsIntervalRef.current = setInterval(() => {
      onSpeakingTimeUpdate?.(
        speakingTimeRef.current,
        silenceTimeRef.current,
        longestSilenceRef.current
      );

      // Update filler breakdown
      const buffer = transcription.getTranscriptBuffer();
      const fillerBreakdown = buffer.getUserFillerBreakdown?.() || {};
      onFillerBreakdownUpdate?.(fillerBreakdown);
    }, 1000);

    return () => {
      clearInterval(interval);
      if (analyticsIntervalRef.current) {
        clearInterval(analyticsIntervalRef.current);
      }
    };
  }, [connectionState, onSpeakingTimeUpdate, onFillerBreakdownUpdate, transcription]);

  // Refs for wingman check interval
  const wingmanStateRef = useRef({
    batteryValue: battery.batteryValue,
    silenceDuration: vad.silenceDuration,
    isSpeaking: vad.isSpeaking,
    agentSpeaking: agentState === "speaking",
    isInGracePeriod: battery.isInGracePeriod,
  });

  useEffect(() => {
    wingmanStateRef.current = {
      batteryValue: battery.batteryValue,
      silenceDuration: vad.silenceDuration,
      isSpeaking: vad.isSpeaking,
      agentSpeaking: agentState === "speaking",
      isInGracePeriod: battery.isInGracePeriod,
    };
  }, [battery.batteryValue, vad.silenceDuration, vad.isSpeaking, agentState, battery.isInGracePeriod]);

  // Check for wingman triggers
  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return;

    checkIntervalRef.current = setInterval(() => {
      const state = wingmanStateRef.current;
      wingman.checkAndTrigger(
        state.batteryValue,
        state.silenceDuration,
        state.isSpeaking,
        state.agentSpeaking,
        state.isInGracePeriod,
        transcription.getTranscriptBuffer()
      );
    }, 500);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [connectionState]);

  // Play TTS when suggestion is shown
  useEffect(() => {
    if (showSuggestion) {
      if (whisperTTS.isEnabled) {
        whisperTTS.speak(showSuggestion.text).catch(console.error);
      }
    }
  }, [showSuggestion]);

  const handleDismissSuggestion = () => {
    setShowSuggestion(null);
  };

  // Determine conversation state for StatusText
  const getConversationState = (): ConversationState => {
    if (connectionState !== ConnectionState.Connected) {
      return "connecting";
    }
    if (vad.isSpeaking) {
      return "user_speaking";
    }
    if (agentState === "speaking") {
      return "partner_speaking";
    }
    if (agentState === "thinking") {
      return "thinking";
    }
    if (agentState === "listening") {
      return "listening";
    }
    return "waiting";
  };

  // Debug info for drawer
  const debugInfo: DebugInfo = {
    batteryValue: battery.batteryValue,
    isDraining: battery.batteryState.isDraining,
    isInGracePeriod: battery.isInGracePeriod,
    vadSpeaking: vad.isSpeaking,
    vadLevel: vad.audioLevel,
    vadListening: vad.isListening,
    silenceDuration: vad.silenceDuration,
    connectionState,
    agentState,
    wingmanCooldown: wingman.isInCooldown,
    cooldownRemaining: wingman.cooldownRemaining,
    coherenceIssue,
    recentTranscript: transcription.recentTranscript,
    fillerRate: transcription.fillerRate,
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* Header */}
      <header className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-white/10">
        <div className="flex items-center gap-2 sm:gap-3">
          <ListeningIndicator isListening={transcription.isListening} />
          <span className="text-xs sm:text-sm text-white/70">
            {transcription.isListening ? "AI Listening" : "Connecting..."}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className={cn(
              "px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-mono rounded-lg transition-colors flex items-center gap-1 sm:gap-2",
              showDebug
                ? "text-accent-primary bg-accent-primary/10"
                : "text-white/70 hover:text-white hover:bg-white/5"
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3 h-3 sm:w-3.5 sm:h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <span className="hidden sm:inline">Debug</span>
          </button>
          <button
            onClick={onEnd}
            className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <span className="sm:hidden">End</span>
            <span className="hidden sm:inline">End Session</span>
          </button>
        </div>
      </header>

      {/* Main content - Battery Hero */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        {/* Voice Orb - tap 3 times for debug */}
        <div
          onClick={handleBatteryTap}
          className="cursor-pointer mb-6 sm:mb-8 scale-[0.72] sm:scale-90 md:scale-100 origin-center"
        >
          <VoiceOrb
            audioLevel={vad.audioLevel}
            batteryValue={battery.batteryValue}
            isUserSpeaking={vad.isSpeaking}
            isAgentSpeaking={agentState === "speaking"}
            size={360}
          />
        </div>

        {/* Status Text */}
        <StatusText
          state={getConversationState()}
          silenceDuration={vad.silenceDuration}
          className="mb-6 sm:mb-8"
        />

        {/* Filler rate indicator */}
        {transcription.fillerRate > 6 && (
          <div
            className={`text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full ${
              transcription.fillerRate > 10
                ? "bg-red-500/20 text-red-400"
                : "bg-yellow-500/20 text-yellow-400"
            }`}
          >
            Filler rate: {transcription.fillerRate.toFixed(1)}/min
            <span className="hidden sm:inline">{transcription.fillerRate > 10 && " - Try pausing instead!"}</span>
          </div>
        )}

        {/* Wingman cooldown indicator */}
        {wingman.isInCooldown && (
          <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-accent-primary/70">
            Wingman ready in {wingman.cooldownRemaining}s
          </div>
        )}
      </main>

      {/* Audio renderer */}
      <RoomAudioRenderer />

      {/* Inline Debug Panel */}
      {showDebug && (
        <div className="border-t border-white/10 bg-surface-elevated">
          <div className="px-5 py-4 max-h-[280px] overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 font-mono text-sm">
              {/* Battery */}
              <div className="glass-card p-4">
                <h3 className="text-accent-primary font-semibold mb-3 text-xs uppercase tracking-wider">Battery</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/70">Value:</span>
                    <span className="text-white">{debugInfo.batteryValue}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Draining:</span>
                    <span className={debugInfo.isDraining ? "text-red-400" : "text-green-400"}>
                      {debugInfo.isDraining ? "YES" : "NO"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Grace:</span>
                    <span className={debugInfo.isInGracePeriod ? "text-yellow-400" : "text-white/70"}>
                      {debugInfo.isInGracePeriod ? "YES" : "NO"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Voice Activity */}
              <div className="glass-card p-4">
                <h3 className="text-accent-primary font-semibold mb-3 text-xs uppercase tracking-wider">Voice</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/70">Speaking:</span>
                    <span className={debugInfo.vadSpeaking ? "text-green-400" : "text-white/70"}>
                      {debugInfo.vadSpeaking ? "YES" : "NO"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Silence:</span>
                    <span className="text-white">{debugInfo.silenceDuration.toFixed(1)}s</span>
                  </div>
                  {/* Audio level bar */}
                  <div className="h-3 bg-gray-700 rounded overflow-hidden mt-2">
                    <div
                      className={cn(
                        "h-full transition-all",
                        debugInfo.vadSpeaking ? "bg-green-500" : "bg-red-500"
                      )}
                      style={{ width: `${Math.min(debugInfo.vadLevel * 500, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Connection */}
              <div className="glass-card p-4">
                <h3 className="text-accent-primary font-semibold mb-3 text-xs uppercase tracking-wider">Connection</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/70">State:</span>
                    <span className="text-white text-xs">{debugInfo.connectionState}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Agent:</span>
                    <span className="text-white">{debugInfo.agentState}</span>
                  </div>
                </div>
              </div>

              {/* Wingman */}
              <div className="glass-card p-4">
                <h3 className="text-accent-primary font-semibold mb-3 text-xs uppercase tracking-wider">Wingman</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/70">Status:</span>
                    <span className={debugInfo.wingmanCooldown ? "text-yellow-400" : "text-green-400"}>
                      {debugInfo.wingmanCooldown ? `CD ${debugInfo.cooldownRemaining}s` : "Ready"}
                    </span>
                  </div>
                  {coherenceIssue && (
                    <div className="text-red-400 text-xs truncate" title={coherenceIssue}>
                      {coherenceIssue}
                    </div>
                  )}
                </div>
              </div>

              {/* Transcript & Stats */}
              <div className="glass-card p-4">
                <h3 className="text-accent-primary font-semibold mb-3 text-xs uppercase tracking-wider">Stats</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/70">Fillers:</span>
                    <span className={cn(
                      debugInfo.fillerRate > 10
                        ? "text-red-400"
                        : debugInfo.fillerRate > 6
                        ? "text-yellow-400"
                        : "text-green-400"
                    )}>
                      {debugInfo.fillerRate.toFixed(1)}/m
                    </span>
                  </div>
                  <div className="text-cyan-400 text-xs truncate" title={debugInfo.recentTranscript}>
                    {debugInfo.recentTranscript ? `"${debugInfo.recentTranscript.slice(0, 30)}..."` : "(no transcript)"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Control bar */}
      <div className="p-3 sm:p-4 border-t border-white/10">
        <VoiceAssistantControlBar />
      </div>

      {/* Suggestion toast */}
      {showSuggestion && (
        <SuggestionToast
          suggestion={showSuggestion.text}
          onDismiss={handleDismissSuggestion}
          isWhispering={whisperTTS.isSpeaking}
        />
      )}
    </div>
  );
}

export function ConversationView({
  config,
  token,
  serverUrl,
  onEnd,
  onBatteryChange,
  onSuggestion,
  onFillerUpdate,
  onSpeakingTimeUpdate,
  onFillerBreakdownUpdate,
}: ConversationViewProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={false}
      className="h-full"
    >
      <ConversationContent
        config={config}
        onEnd={onEnd}
        onBatteryChange={onBatteryChange}
        onSuggestion={onSuggestion}
        onFillerUpdate={onFillerUpdate}
        onSpeakingTimeUpdate={onSpeakingTimeUpdate}
        onFillerBreakdownUpdate={onFillerBreakdownUpdate}
      />
    </LiveKitRoom>
  );
}
