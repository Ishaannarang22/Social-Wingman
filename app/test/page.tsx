"use client";

import { useState } from "react";
import { SimpleVoiceRoom } from "@/components/SimpleVoiceRoom";

// Test audio function using Web Audio API
function playTestTone(frequency: number = 440, duration: number = 0.5) {
  try {
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

    return true;
  } catch (e) {
    console.error("Failed to play test tone:", e);
    return false;
  }
}

export default function TestPage() {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [speakerStatus, setSpeakerStatus] = useState<"untested" | "playing" | "done">("untested");

  const testSpeakers = () => {
    console.log("Testing speakers...");
    setSpeakerStatus("playing");

    try {
      playTestTone(440, 0.3);
      setTimeout(() => playTestTone(554, 0.3), 300);
      setTimeout(() => {
        playTestTone(659, 0.5);
        setTimeout(() => setSpeakerStatus("done"), 600);
      }, 600);
    } catch (e) {
      console.error("Audio playback error:", e);
      setError("Failed to play audio. Check your browser permissions.");
      setSpeakerStatus("untested");
    }
  };

  const startSession = async () => {
    setLoading(true);
    setError(null);

    try {
      const roomName = "test-" + Date.now();
      const response = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName,
          participantName: "TestUser",
          metadata: { persona: "hackathon_contact" },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get token");
      }

      const data = await response.json();
      console.log("Got token for room:", roomName);
      setToken(data.token);
      setServerUrl(data.url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (token && serverUrl) {
    return <SimpleVoiceRoom token={token} serverUrl={serverUrl} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-8">Voice Test</h1>

      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded p-4 mb-4">
          {error}
        </div>
      )}

      {/* Speaker Test Section */}
      <div className="mb-8 p-6 bg-gray-800 rounded-lg">
        <h2 className="text-lg font-semibold mb-4 text-center">Step 1: Test Your Speakers</h2>
        <button
          onClick={testSpeakers}
          type="button"
          className="px-6 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-lg font-semibold cursor-pointer transition-colors"
        >
          🔊 Click to Play Test Tones
        </button>
        <p className="mt-3 text-sm text-gray-400 text-center">
          {speakerStatus === "playing"
            ? "🔊 Playing test tones NOW..."
            : speakerStatus === "done"
            ? "✅ Did you hear 3 ascending tones? If yes, speakers work!"
            : "Click the button above. You should hear 3 ascending tones."}
        </p>
      </div>

      {/* Start Session Section */}
      <div className="p-6 bg-gray-800 rounded-lg">
        <h2 className="text-lg font-semibold mb-4 text-center">Step 2: Start Voice Session</h2>
        <button
          onClick={startSession}
          disabled={loading}
          type="button"
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-xl font-semibold cursor-pointer transition-colors"
        >
          {loading ? "Starting..." : "Start Voice Test"}
        </button>
      </div>

      <p className="mt-8 text-gray-400 text-center max-w-md">
        Make sure your microphone is allowed when prompted.
      </p>
    </div>
  );
}
