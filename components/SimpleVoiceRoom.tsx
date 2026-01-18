"use client";

import { useEffect, useState, useRef } from "react";
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  useRoomContext,
  useConnectionState,
  useLocalParticipant,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";

// Test audio function using Web Audio API
function playTestTone(frequency: number = 440, duration: number = 0.5) {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = "sine";

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);

  return audioContext;
}

function VoiceContent() {
  const connectionState = useConnectionState();
  const { state: agentState, audioTrack } = useVoiceAssistant();
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [micEnabled, setMicEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug logging
  useEffect(() => {
    console.log("=== Voice Room State ===");
    console.log("Connection:", connectionState);
    console.log("Agent state:", agentState);
    console.log("Local participant:", localParticipant?.identity);
    console.log("Mic enabled:", localParticipant?.isMicrophoneEnabled);
    console.log("Audio track:", audioTrack ? "yes" : "no");

    if (room) {
      console.log("Remote participants:", room.remoteParticipants.size);
      room.remoteParticipants.forEach((p) => {
        const tracks = Array.from(p.trackPublications.values()).map(t => t.kind);
        console.log("  - " + p.identity + ": " + tracks.join(", "));
      });
    }
  }, [connectionState, agentState, localParticipant, audioTrack, room]);

  // Enable microphone when connected
  useEffect(() => {
    if (connectionState === ConnectionState.Connected && localParticipant && !micEnabled) {
      console.log("Enabling microphone...");
      localParticipant.setMicrophoneEnabled(true)
        .then(() => {
          console.log("Microphone enabled!");
          setMicEnabled(true);
        })
        .catch((err: Error) => {
          console.error("Failed to enable mic:", err);
          setError("Mic error: " + err.message);
        });
    }
  }, [connectionState, localParticipant, micEnabled]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-bold mb-8">Voice Practice</h1>

      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded p-4 mb-4">
          {error}
        </div>
      )}

      {/* Status */}
      <div className="bg-gray-800 rounded-lg p-6 mb-8 w-full max-w-md">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Connection:</span>
            <span className={connectionState === ConnectionState.Connected ? "text-green-400" : "text-yellow-400"}>
              {connectionState}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Agent:</span>
            <span className={agentState === "listening" || agentState === "speaking" ? "text-green-400" : "text-yellow-400"}>
              {agentState || "waiting"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Your Mic:</span>
            <span className={micEnabled ? "text-green-400" : "text-red-400"}>
              {micEnabled ? "ON" : "OFF"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Agent Audio:</span>
            <span className={audioTrack ? "text-green-400" : "text-yellow-400"}>
              {audioTrack ? "receiving" : "none"}
            </span>
          </div>
        </div>
      </div>

      {/* Visualizer */}
      <div className="w-64 h-32 mb-8">
        {audioTrack ? (
          <BarVisualizer
            state={agentState}
            barCount={5}
            trackRef={audioTrack}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full bg-gray-800 rounded flex items-center justify-center">
            <span className="text-gray-500">Waiting for agent...</span>
          </div>
        )}
      </div>

      {/* Instructions */}
      <p className="text-gray-400 text-center max-w-md">
        {connectionState !== ConnectionState.Connected
          ? "Connecting to room..."
          : !micEnabled
          ? "Enabling microphone..."
          : agentState === "speaking"
          ? "Agent is speaking..."
          : "Speak now! The agent is listening."}
      </p>

      {/* Test Audio Button */}
      <div className="mt-8 space-y-4">
        <button
          onClick={() => {
            console.log("Playing test tone...");
            playTestTone(440, 0.3);
            setTimeout(() => playTestTone(554, 0.3), 300);
            setTimeout(() => playTestTone(659, 0.5), 600);
          }}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold"
        >
          🔊 Test Speakers
        </button>
        <p className="text-xs text-gray-500 text-center">
          Click to play a test tone. If you hear it, your speakers work.
        </p>
      </div>

      <RoomAudioRenderer />
    </div>
  );
}

interface SimpleVoiceRoomProps {
  token: string;
  serverUrl: string;
}

export function SimpleVoiceRoom({ token, serverUrl }: SimpleVoiceRoomProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      audio={true}
      video={false}
    >
      <VoiceContent />
    </LiveKitRoom>
  );
}
