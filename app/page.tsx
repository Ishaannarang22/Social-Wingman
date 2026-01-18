"use client";

import { useState, useCallback } from "react";
import { SessionSetup } from "@/components/SessionSetup";
import { ConversationView } from "@/components/ConversationView";
import { AnalyticsSummary } from "@/components/AnalyticsSummary";
import { useSession, SessionConfig } from "@/hooks/useSession";

export default function Home() {
  const session = useSession();
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleStartSession = useCallback(
    async (config: SessionConfig) => {
      try {
        setError(null);
        setIsConnecting(true);
        session.startSession(config);

        // Generate unique room name
        const roomName = `practice-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        // Get LiveKit token
        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomName,
            participantName: config.userName,
            metadata: {
              eventType: config.eventType,
              userRole: config.userRole,
              persona: config.persona,
            },
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get LiveKit token");
        }

        const { token, url } = await response.json();
        setLivekitToken(token);
        setLivekitUrl(url);
        setIsConnecting(false);
        session.setActive();
      } catch (err) {
        console.error("Error starting session:", err);
        setError(
          err instanceof Error ? err.message : "Failed to start session"
        );
        setIsConnecting(false);
        session.resetSession();
      }
    },
    [session]
  );

  const handleEndSession = useCallback(() => {
    session.endSession();
    setLivekitToken(null);
    setLivekitUrl(null);
  }, [session]);

  const handleNewSession = useCallback(() => {
    session.resetSession();
    setLivekitToken(null);
    setLivekitUrl(null);
    setError(null);
  }, [session]);

  const handleBatteryChange = useCallback(
    (value: number) => {
      session.recordBatteryValue(value);
    },
    [session]
  );

  const handleSuggestion = useCallback(() => {
    session.recordWingmanSuggestion();
  }, [session]);

  const handleFillerUpdate = useCallback(
    (fillerRate: number, fillerCount: number) => {
      session.updateFillerStats(fillerRate, fillerCount);
    },
    [session]
  );

  const handleSpeakingTimeUpdate = useCallback(
    (speakingTime: number, silenceTime: number, longestSilence: number) => {
      session.updateSpeakingTime(speakingTime, silenceTime, longestSilence);
    },
    [session]
  );

  const handleFillerBreakdownUpdate = useCallback(
    (fillerCounts: Record<string, number>) => {
      session.updateFillerBreakdown(fillerCounts);
    },
    [session]
  );

  return (
    <main className="min-h-screen bg-surface">
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg z-50">
          {error}
        </div>
      )}

      {(session.sessionState === "setup" || session.sessionState === "connecting") && !session.sessionConfig && (
        <div
          className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/basebg.png')" }}
        >
          <SessionSetup
            onStart={handleStartSession}
            isConnecting={isConnecting}
          />
        </div>
      )}

      {session.sessionState === "active" &&
        livekitToken &&
        livekitUrl &&
        session.sessionConfig && (
          <ConversationView
            config={session.sessionConfig}
            token={livekitToken}
            serverUrl={livekitUrl}
            onEnd={handleEndSession}
            onBatteryChange={handleBatteryChange}
            onSuggestion={handleSuggestion}
            onFillerUpdate={handleFillerUpdate}
            onSpeakingTimeUpdate={handleSpeakingTimeUpdate}
            onFillerBreakdownUpdate={handleFillerBreakdownUpdate}
          />
        )}

      {session.sessionState === "ended" && session.analytics && (
        <div className="min-h-screen flex items-center justify-center">
          <AnalyticsSummary
            analytics={session.analytics}
            onNewSession={handleNewSession}
          />
        </div>
      )}
    </main>
  );
}
