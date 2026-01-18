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

  // Start transcription when connected
  useEffect(() => {
    if (connectionState === ConnectionState.Connected) {
      transcription.startListening();
    }
    return () => {
      transcription.stopListening();
    };
  }, [connectionState]);

  // Update battery based on transcription state
  useEffect(() => {
    if (transcription.isSpeaking) {
      battery.recordSpeech();
    } else if (transcription.isListening && agentState !== "speaking") {
      battery.startDraining();
    } else {
      battery.stopDraining();
    }
  }, [transcription.isSpeaking, transcription.isListening, agentState]);

  // Apply filler penalty
  useEffect(() => {
    if (transcription.fillerRate > 0) {
      battery.applyFillerPenalty(transcription.fillerRate);
    }
  }, [transcription.fillerRate]);

  // Report battery changes
  useEffect(() => {
    onBatteryChange?.(battery.batteryValue);
  }, [battery.batteryValue, onBatteryChange]);

  // Check for wingman triggers periodically
  useEffect(() => {
    checkIntervalRef.current = setInterval(() => {
      if (transcription.isListening) {
        wingman.checkAndTrigger(
          battery.batteryValue,
          transcription.silenceDuration,
          transcription.isSpeaking,
          agentState === "speaking",
          battery.isInGracePeriod,
          transcription.getTranscriptBuffer()
        );
      }
    }, 500);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [
    transcription.isListening,
    transcription.isSpeaking,
    transcription.silenceDuration,
    battery.batteryValue,
    battery.isInGracePeriod,
    agentState,
  ]);

  // Play TTS when suggestion is shown
  useEffect(() => {
    if (showSuggestion && whisperTTS.isEnabled) {
      whisperTTS.speak(showSuggestion.text);
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
          {/* Debug info */}
          <p className="text-xs text-gray-600 mt-2">
            Agent state: {agentState} | Connection: {connectionState} | Audio: {audioTrack ? "yes" : "no"}
          </p>
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
