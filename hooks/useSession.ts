"use client";

import { useState, useCallback, useRef } from "react";
import { SessionAnalyticsCollector } from "@/lib/sessionAnalytics";
import { SessionAnalytics } from "@/types/analytics";
import { PersonaKey } from "@/lib/wingmanPrompts";

export type SessionState = "setup" | "connecting" | "active" | "ended";

export interface SessionConfig {
  eventType: string;
  userRole: string;
  persona: PersonaKey;
  userName: string;
}

export interface UseSessionReturn {
  sessionState: SessionState;
  sessionConfig: SessionConfig | null;
  analytics: SessionAnalytics | null;
  sessionDuration: number;
  startSession: (config: SessionConfig) => void;
  endSession: () => SessionAnalytics;
  setConnecting: () => void;
  setActive: () => void;
  recordUserSegment: (segment: Parameters<SessionAnalyticsCollector["recordUserSegment"]>[0]) => void;
  recordPartnerSegment: (segment: Parameters<SessionAnalyticsCollector["recordPartnerSegment"]>[0]) => void;
  recordBatteryValue: (value: number) => void;
  recordWingmanSuggestion: () => void;
  updateFillerStats: (fillerRate: number, fillerCount: number) => void;
  resetSession: () => void;
}

const DEFAULT_CONFIG: SessionConfig = {
  eventType: "networking",
  userRole: "professional",
  persona: "hackathon_contact",
  userName: "User",
};

export function useSession(): UseSessionReturn {
  const [sessionState, setSessionState] = useState<SessionState>("setup");
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);

  const analyticsRef = useRef<SessionAnalyticsCollector>(new SessionAnalyticsCollector());
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Start a new session
  const startSession = useCallback((config: SessionConfig) => {
    analyticsRef.current = new SessionAnalyticsCollector();
    analyticsRef.current.startSession();
    startTimeRef.current = Date.now();

    setSessionConfig(config);
    setSessionState("connecting");
    setAnalytics(null);
    setSessionDuration(0);

    // Start duration tracking
    durationIntervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setSessionDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
  }, []);

  // Set state to connecting
  const setConnecting = useCallback(() => {
    setSessionState("connecting");
  }, []);

  // Set state to active
  const setActive = useCallback(() => {
    setSessionState("active");
  }, []);

  // End the current session
  const endSession = useCallback(() => {
    // Stop duration tracking
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    const finalAnalytics = analyticsRef.current.endSession();
    setAnalytics(finalAnalytics);
    setSessionState("ended");

    return finalAnalytics;
  }, []);

  // Record user speech segment
  const recordUserSegment = useCallback(
    (segment: Parameters<SessionAnalyticsCollector["recordUserSegment"]>[0]) => {
      analyticsRef.current.recordUserSegment(segment);
    },
    []
  );

  // Record partner speech segment
  const recordPartnerSegment = useCallback(
    (segment: Parameters<SessionAnalyticsCollector["recordPartnerSegment"]>[0]) => {
      analyticsRef.current.recordPartnerSegment(segment);
    },
    []
  );

  // Record battery value
  const recordBatteryValue = useCallback((value: number) => {
    analyticsRef.current.recordBatteryValue(value);
  }, []);

  // Record Wingman suggestion
  const recordWingmanSuggestion = useCallback(() => {
    analyticsRef.current.recordWingmanSuggestion();
  }, []);

  // Update filler stats
  const updateFillerStats = useCallback((fillerRate: number, fillerCount: number) => {
    analyticsRef.current.updateFillerStats(fillerRate, fillerCount);
  }, []);

  // Reset session to setup state
  const resetSession = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    analyticsRef.current.reset();
    startTimeRef.current = null;

    setSessionState("setup");
    setSessionConfig(null);
    setAnalytics(null);
    setSessionDuration(0);
  }, []);

  return {
    sessionState,
    sessionConfig,
    analytics,
    sessionDuration,
    startSession,
    endSession,
    setConnecting,
    setActive,
    recordUserSegment,
    recordPartnerSegment,
    recordBatteryValue,
    recordWingmanSuggestion,
    updateFillerStats,
    resetSession,
  };
}
