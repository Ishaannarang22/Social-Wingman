"use client";

import { cn } from "@/lib/utils";

export type ConversationState =
  | "connecting"
  | "waiting"
  | "partner_speaking"
  | "listening"
  | "user_speaking"
  | "thinking";

export interface StatusTextProps {
  state: ConversationState;
  silenceDuration?: number;
  className?: string;
}

const STATUS_CONFIG: Record<
  ConversationState,
  { text: string; subtext?: string; color: string }
> = {
  connecting: {
    text: "Connecting...",
    color: "text-gray-600",
  },
  waiting: {
    text: "Connected",
    subtext: "Waiting for partner...",
    color: "text-gray-600",
  },
  partner_speaking: {
    text: "Partner is speaking",
    subtext: "Listen actively",
    color: "text-purple-600",
  },
  listening: {
    text: "Listening...",
    color: "text-[#7a9f6a]",
  },
  user_speaking: {
    text: "You're speaking",
    subtext: "Keep it up!",
    color: "text-green-600",
  },
  thinking: {
    text: "Partner is thinking...",
    color: "text-yellow-600",
  },
};

export function StatusText({
  state,
  silenceDuration = 0,
  className,
}: StatusTextProps) {
  const config = STATUS_CONFIG[state];

  // Show silence duration if significant
  const showSilence = state === "listening" && silenceDuration > 1.5;

  return (
    <div className={cn("text-center", className)}>
      <p className={cn("text-xl font-medium", config.color)}>{config.text}</p>
      {config.subtext && !showSilence && (
        <p className="text-sm text-white/55 mt-1">{config.subtext}</p>
      )}
      {showSilence && (
        <p className="text-sm text-yellow-400/80 mt-1">
          Silence: {silenceDuration.toFixed(1)}s
        </p>
      )}
    </div>
  );
}
