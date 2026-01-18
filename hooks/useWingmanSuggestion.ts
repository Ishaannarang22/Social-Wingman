"use client";

import { useState, useCallback, useRef } from "react";
import { TriggerEngine, TriggerEvent } from "@/lib/triggerEngine";
import { RollingTranscriptBuffer } from "@/lib/transcriptBuffer";
import { WingmanSuggestion } from "@/types/analytics";

export interface UseWingmanSuggestionOptions {
  eventType?: string;
  userRole?: string;
  onSuggestion?: (suggestion: WingmanSuggestion) => void;
}

export interface UseWingmanSuggestionReturn {
  currentSuggestion: string | null;
  isGenerating: boolean;
  isInCooldown: boolean;
  cooldownRemaining: number;
  suggestionCount: number;
  checkAndTrigger: (
    batteryLevel: number,
    silenceDuration: number,
    isUserSpeaking: boolean,
    isPartnerSpeaking: boolean,
    isInGracePeriod: boolean,
    transcriptBuffer: RollingTranscriptBuffer
  ) => Promise<void>;
  clearSuggestion: () => void;
  reset: () => void;
}

export function useWingmanSuggestion(
  options: UseWingmanSuggestionOptions = {}
): UseWingmanSuggestionReturn {
  const { eventType = "networking", userRole = "professional", onSuggestion } = options;

  const [currentSuggestion, setCurrentSuggestion] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInCooldown, setIsInCooldown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [suggestionCount, setSuggestionCount] = useState(0);

  const triggerEngineRef = useRef(new TriggerEngine());
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update cooldown state
  const updateCooldownState = useCallback(() => {
    const state = triggerEngineRef.current.getState();
    setIsInCooldown(state.isInCooldown);
    setCooldownRemaining(Math.ceil(state.cooldownRemaining));

    if (!state.isInCooldown && cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }
  }, []);

  // Generate suggestion via API
  const generateSuggestion = useCallback(
    async (
      triggerEvent: TriggerEvent,
      transcriptBuffer: RollingTranscriptBuffer
    ): Promise<string | null> => {
      try {
        setIsGenerating(true);

        const lastPartnerUtterance = transcriptBuffer.getLastPartnerUtterance();
        const recentTranscript = transcriptBuffer.getTranscriptText();

        const response = await fetch("/api/wingman/suggest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recentTranscript,
            lastPartnerUtterance: lastPartnerUtterance?.text || "",
            eventType,
            userRole,
            triggerReason: triggerEvent.reason,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate suggestion");
        }

        const data = await response.json();
        return data.suggestion;
      } catch (error) {
        console.error("Error generating suggestion:", error);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [eventType, userRole]
  );

  // Check conditions and potentially trigger suggestion
  const checkAndTrigger = useCallback(
    async (
      batteryLevel: number,
      silenceDuration: number,
      isUserSpeaking: boolean,
      isPartnerSpeaking: boolean,
      isInGracePeriod: boolean,
      transcriptBuffer: RollingTranscriptBuffer
    ) => {
      const triggerEvent = triggerEngineRef.current.shouldTrigger(
        batteryLevel,
        silenceDuration,
        isUserSpeaking,
        isPartnerSpeaking,
        isInGracePeriod
      );

      if (triggerEvent) {
        console.log("📢 Wingman trigger event received:", triggerEvent);

        // Start cooldown tracking
        updateCooldownState();
        cooldownIntervalRef.current = setInterval(updateCooldownState, 1000);

        // Generate suggestion
        console.log("📢 Generating suggestion...");
        const suggestion = await generateSuggestion(triggerEvent, transcriptBuffer);
        console.log("📢 Suggestion generated:", suggestion);

        if (suggestion) {
          setCurrentSuggestion(suggestion);
          setSuggestionCount((prev) => prev + 1);

          const wingmanSuggestion: WingmanSuggestion = {
            type: "suggestion",
            text: suggestion,
            timestamp: Date.now(),
            triggeredBy: triggerEvent.reason,
          };

          console.log("📢 Calling onSuggestion callback...");
          if (onSuggestion) {
            onSuggestion(wingmanSuggestion);
          }
        } else {
          console.log("📢 No suggestion was generated!");
        }
      }

      updateCooldownState();
    },
    [generateSuggestion, onSuggestion, updateCooldownState]
  );

  // Clear current suggestion
  const clearSuggestion = useCallback(() => {
    setCurrentSuggestion(null);
  }, []);

  // Reset everything
  const reset = useCallback(() => {
    triggerEngineRef.current.reset();
    setCurrentSuggestion(null);
    setIsGenerating(false);
    setIsInCooldown(false);
    setCooldownRemaining(0);
    setSuggestionCount(0);

    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }
  }, []);

  return {
    currentSuggestion,
    isGenerating,
    isInCooldown,
    cooldownRemaining,
    suggestionCount,
    checkAndTrigger,
    clearSuggestion,
    reset,
  };
}
