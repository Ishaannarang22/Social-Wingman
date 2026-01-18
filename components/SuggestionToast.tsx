"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Lightbulb, Volume2, X } from "lucide-react";

export interface SuggestionToastProps {
  suggestion: string;
  onDismiss: () => void;
  autoHideDuration?: number;
  isWhispering?: boolean;
}

export function SuggestionToast({
  suggestion,
  onDismiss,
  autoHideDuration = 8000,
  isWhispering = false,
}: SuggestionToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Auto-hide
    const timer = setTimeout(() => {
      handleDismiss();
    }, autoHideDuration);

    return () => clearTimeout(timer);
  }, [autoHideDuration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 200);
  };

  return (
    <div
      className={cn(
        "fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 w-full max-w-md px-3 sm:px-4",
        "transform transition-all duration-300 ease-out z-50",
        isVisible && !isExiting
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0"
      )}
    >
      <div className="bg-white/90 backdrop-blur-md rounded-xl border border-[#7a9f6a]/30 p-3 sm:p-4 shadow-xl shadow-[#7a9f6a]/10">
        <div className="flex items-start gap-2 sm:gap-3">
          {/* Wingman icon with animation */}
          <div
            className={cn(
              "flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#7a9f6a]/20",
              "flex items-center justify-center",
              isWhispering && "animate-pulse"
            )}
          >
            {isWhispering ? (
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#7a9f6a]" />
            ) : (
              <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-[#7a9f6a]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-medium text-gray-800 leading-relaxed">
              {suggestion}
            </p>
            {isWhispering && (
              <p className="text-[10px] sm:text-xs text-[#7a9f6a] mt-1 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#7a9f6a] animate-pulse" />
                Whispering...
              </p>
            )}
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Progress bar for auto-dismiss */}
        <div className="mt-2 sm:mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#7a9f6a] to-[#9ab88a] origin-left rounded-full"
            style={{
              animation: `shrinkWidth ${autoHideDuration}ms linear forwards`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
