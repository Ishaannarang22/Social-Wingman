"use client";

export interface ListeningIndicatorProps {
  isListening: boolean;
  className?: string;
}

export function ListeningIndicator({
  isListening,
  className = "",
}: ListeningIndicatorProps) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
        isListening
          ? "bg-blue-500/20 text-blue-400"
          : "bg-gray-700/50 text-gray-500"
      } ${className}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isListening ? "bg-blue-400 listening-pulse" : "bg-gray-500"
        }`}
      />
      <span>AI Assist {isListening ? "Listening" : "Off"}</span>
    </div>
  );
}
