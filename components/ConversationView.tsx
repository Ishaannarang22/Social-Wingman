"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  useRoomContext,
  useConnectionState,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { BatteryMeter } from "./BatteryMeter";
import { ListeningIndicator } from "./ListeningIndicator";
import { SuggestionToast } from "./SuggestionToast";
import { useWingmanTranscription } from "@/hooks/useWingmanTranscription";
import { useSocialBattery } from "@/hooks/useSocialBattery";
import { useWingmanSuggestion } from "@/hooks/useWingmanSuggestion";
import { useWhisperTTS } from "@/hooks/useWhisperTTS";
import { useVoiceActivityDetection } from "@/hooks/useVoiceActivityDetection";
import { SessionConfig } from "@/hooks/useSession";
import { WingmanSuggestion } from "@/types/analytics";

interface ConversationViewProps {
  config: SessionConfig;
  token: string;
  serverUrl: string;
  onEnd: () => void;
  onBatteryChange?: (value: number) => void;
  onSuggestion?: () => void;
}

function ConversationContent({
  config,
  onEnd,
  onBatteryChange,
  onSuggestion,
}: Omit<ConversationViewProps, "token" | "serverUrl">) {
  const connectionState = useConnectionState();
  const { state: agentState, audioTrack } = useVoiceAssistant();
  const room = useRoomContext();

  const [showSuggestion, setShowSuggestion] = useState<WingmanSuggestion | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Debug logging
  useEffect(() => {
    console.log("=== ConversationContent State ===");
    console.log("  connectionState:", connectionState);
    console.log("  agentState:", agentState);
    console.log("  audioTrack:", audioTrack ? "present" : "null");
    console.log("  room participants:", room?.remoteParticipants?.size ?? 0);

    // Log remote participants
    if (room?.remoteParticipants) {
      room.remoteParticipants.forEach((p, identity) => {
        console.log(`  Remote participant: ${identity}, tracks:`,
          Array.from(p.trackPublications.values()).map(t => t.kind)
        );
      });
    }
  }, [connectionState, agentState, audioTrack, room]);

  // Initialize hooks
  const transcription = useWingmanTranscription();
  const vad = useVoiceActivityDetection({
    silenceThreshold: 0.15,  // Below 15% = silence
    speechThreshold: 0.16,   // Above 16% = speaking
    silenceDelay: 300,       // 300ms of quiet before marking as silent
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

  // Start VAD and transcription when connected
  useEffect(() => {
    console.log("=== Connection State Effect ===");
    console.log("  connectionState:", connectionState);

    if (connectionState === ConnectionState.Connected) {
      console.log("  → Starting VAD and transcription");
      vad.startListening();
      transcription.startListening();
    }

    return () => {
      vad.stopListening();
      transcription.stopListening();
    };
  }, [connectionState]);

  // Battery logic using VAD (voice activity detection)
  // - Recharge when user speaks
  // - Drain when user is silent AND bot is not speaking
  // - Pause when bot is speaking (user is listening, not penalized)
  useEffect(() => {
    if (!vad.isListening) return;

    if (vad.isSpeaking) {
      console.log("Battery: User speaking → recharge");
      battery.recordSpeech();
    } else if (agentState === "speaking") {
      console.log("Battery: Bot speaking → pause (user listening)");
      battery.stopDraining();
    } else {
      console.log("Battery: User silent, bot not speaking → drain");
      battery.startDraining();
    }
  }, [vad.isListening, vad.isSpeaking, agentState]);

  // Apply filler penalty
  useEffect(() => {
    if (transcription.fillerRate > 0) {
      battery.applyFillerPenalty(transcription.fillerRate);
    }
  }, [transcription.fillerRate]);

  // Coherence check - evaluate speech clarity periodically
  const lastCoherenceCheckRef = useRef<number>(0);
  const [coherenceIssue, setCoherenceIssue] = useState<string | null>(null);

  useEffect(() => {
    const checkCoherence = async () => {
      const now = Date.now();
      // Only check every 5 seconds
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
          console.log("Coherence score:", score, issue);

          if (score < 0.5) {
            // Incoherent speech - apply penalty
            setCoherenceIssue(issue || "Speech unclear");
            battery.applyFillerPenalty(15); // Heavy penalty for incoherence
          } else if (score < 0.7) {
            // Slightly unclear
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

    // Check when transcript updates
    if (transcription.recentTranscript) {
      checkCoherence();
    }
  }, [transcription.recentTranscript]);

  // Report battery changes
  useEffect(() => {
    onBatteryChange?.(battery.batteryValue);
  }, [battery.batteryValue, onBatteryChange]);

  // Refs to hold current values for the interval (avoids stale closure)
  const wingmanStateRef = useRef({
    batteryValue: battery.batteryValue,
    silenceDuration: vad.silenceDuration,
    isSpeaking: vad.isSpeaking,
    agentSpeaking: agentState === "speaking",
    isInGracePeriod: battery.isInGracePeriod,
  });

  // Keep refs updated
  useEffect(() => {
    wingmanStateRef.current = {
      batteryValue: battery.batteryValue,
      silenceDuration: vad.silenceDuration,
      isSpeaking: vad.isSpeaking,
      agentSpeaking: agentState === "speaking",
      isInGracePeriod: battery.isInGracePeriod,
    };
  }, [battery.batteryValue, vad.silenceDuration, vad.isSpeaking, agentState, battery.isInGracePeriod]);

  // Check for wingman triggers periodically
  // Wingman intervenes when: battery < 50% AND silence > 2s, OR silence > 5s
  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return;

    console.log("Setting up wingman check interval");

    checkIntervalRef.current = setInterval(() => {
      const state = wingmanStateRef.current;
      // Always check - let trigger engine handle conditions
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
      console.log("🔊 Suggestion received:", showSuggestion.text);
      console.log("🔊 TTS enabled:", whisperTTS.isEnabled);
      if (whisperTTS.isEnabled) {
        console.log("🔊 Playing TTS...");
        whisperTTS.speak(showSuggestion.text).then(() => {
          console.log("🔊 TTS finished");
        }).catch((err) => {
          console.error("🔊 TTS error:", err);
        });
      }
    }
  }, [showSuggestion]);

  const handleDismissSuggestion = () => {
    setShowSuggestion(null);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <BatteryMeter value={battery.batteryValue} showLabel size="lg" />
          <ListeningIndicator isListening={transcription.isListening} />
        </div>
        <button
          onClick={onEnd}
          className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          End Session
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Agent visualizer */}
        <div className="w-full max-w-md aspect-square flex items-center justify-center mb-8">
          {audioTrack ? (
            <BarVisualizer
              state={agentState}
              barCount={5}
              trackRef={audioTrack}
              className="w-full h-48"
            />
          ) : (
            <div className="w-48 h-48 rounded-full bg-gray-800/50 flex items-center justify-center">
              <div
                className={`w-32 h-32 rounded-full ${
                  connectionState === ConnectionState.Connected
                    ? "bg-blue-500/30 animate-pulse"
                    : "bg-gray-700"
                }`}
              />
            </div>
          )}
        </div>

        {/* Agent state indicator */}
        <div className="text-center mb-8">
          <p className="text-lg font-medium text-white mb-1">
            {agentState === "speaking"
              ? "Partner is speaking..."
              : agentState === "listening"
              ? "Listening..."
              : agentState === "thinking"
              ? "Thinking..."
              : connectionState === ConnectionState.Connected
              ? "Connected - Waiting for agent..."
              : `Connecting... (${connectionState})`}
          </p>
          <p className="text-sm text-gray-500">
            {transcription.isSpeaking && "You're speaking"}
            {!transcription.isSpeaking &&
              transcription.silenceDuration > 1.5 &&
              `Silence: ${transcription.silenceDuration.toFixed(1)}s`}
          </p>
          {/* Debug panel */}
          <div className="mt-4 p-3 bg-gray-800 rounded-lg text-xs font-mono">
            <div className="text-yellow-400 mb-1">DEBUG:</div>
            <div>Battery: {battery.batteryValue} | Draining: {battery.batteryState.isDraining ? "YES" : "NO"}</div>
            <div>Grace Period: {battery.isInGracePeriod ? "YES" : "NO"}</div>
            <div>VAD Speaking: {vad.isSpeaking ? "YES" : "NO"} | Level: {(vad.audioLevel * 100).toFixed(1)}%</div>
            <div>VAD Listening: {vad.isListening ? "YES" : "NO"}</div>
            <div>Silence: {vad.silenceDuration.toFixed(1)}s</div>
            <div>Connection: {connectionState} | Agent: {agentState}</div>
            <div className="text-purple-400">
              Wingman: {wingman.isInCooldown ? `Cooldown ${wingman.cooldownRemaining}s` : "Ready"} |
              Triggers at: &lt;50% + 2s silence OR 5s silence
            </div>
            {coherenceIssue && (
              <div className="text-red-400 mt-1">Coherence: {coherenceIssue}</div>
            )}
            <div className="text-cyan-400 mt-1 truncate">
              Transcript: {transcription.recentTranscript || "(empty)"}
            </div>
            {/* Audio level bar */}
            <div className="mt-2 h-2 bg-gray-700 rounded overflow-hidden">
              <div
                className={`h-full transition-all ${vad.isSpeaking ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(vad.audioLevel * 500, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 text-sm text-gray-400">
          <div>
            Filler rate:{" "}
            <span
              className={
                transcription.fillerRate > 10
                  ? "text-red-400"
                  : transcription.fillerRate > 6
                  ? "text-yellow-400"
                  : "text-green-400"
              }
            >
              {transcription.fillerRate.toFixed(1)}/min
            </span>
          </div>
          {wingman.isInCooldown && (
            <div className="text-purple-400">
              Wingman cooldown: {wingman.cooldownRemaining}s
            </div>
          )}
        </div>
      </main>

      {/* Audio renderer */}
      <RoomAudioRenderer />

      {/* Control bar */}
      <div className="p-4 border-t border-gray-800">
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
      />
    </LiveKitRoom>
  );
}
