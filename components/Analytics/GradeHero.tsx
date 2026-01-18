"use client";

import { useMemo, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface GradeHeroProps {
  score: number; // 0-100
  className?: string;
}

interface GradeInfo {
  letter: string;
  subtitle: string;
  color: string;
}

function getGradeInfo(score: number): GradeInfo {
  if (score >= 90) {
    return { letter: "A", subtitle: "Excellent!", color: "from-green-400 to-emerald-500" };
  } else if (score >= 80) {
    return { letter: "B+", subtitle: "Great Flow", color: "from-accent-primary to-accent-secondary" };
  } else if (score >= 70) {
    return { letter: "B", subtitle: "Good Job", color: "from-blue-400 to-cyan-500" };
  } else if (score >= 60) {
    return { letter: "C+", subtitle: "Keep Practicing", color: "from-yellow-400 to-amber-500" };
  } else {
    return { letter: "C", subtitle: "Room to Grow", color: "from-orange-400 to-red-500" };
  }
}

export function GradeHero({ score, className }: GradeHeroProps) {
  const gradeInfo = useMemo(() => getGradeInfo(score), [score]);
  const [showConfetti, setShowConfetti] = useState(false);

  // Trigger confetti for A grades
  useEffect(() => {
    if (score >= 90) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [score]);

  return (
    <div className={cn("relative text-center", className)}>
      {/* Confetti effect for A grades */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: "50%",
                backgroundColor: ["#8b5cf6", "#06b6d4", "#22c55e", "#f59e0b"][
                  Math.floor(Math.random() * 4)
                ],
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Grade circle */}
      <div className="relative inline-flex items-center justify-center w-32 h-32 sm:w-40 sm:h-40 mb-3 sm:mb-4">
        {/* Glow effect */}
        <div
          className={cn(
            "absolute inset-0 rounded-full opacity-30 blur-xl",
            `bg-gradient-to-br ${gradeInfo.color}`
          )}
        />

        {/* Circle border */}
        <div
          className={cn(
            "relative w-full h-full rounded-full",
            "bg-gradient-to-br p-1",
            gradeInfo.color
          )}
        >
          <div className="w-full h-full rounded-full bg-white/80 flex items-center justify-center">
            <span
              className={cn(
                "text-5xl sm:text-7xl font-display font-bold",
                "bg-gradient-to-br bg-clip-text text-transparent",
                gradeInfo.color
              )}
            >
              {gradeInfo.letter}
            </span>
          </div>
        </div>
      </div>

      {/* Subtitle */}
      <p className="text-lg sm:text-xl text-gray-600 font-medium">{gradeInfo.subtitle}</p>
    </div>
  );
}

/**
 * Calculate session grade score based on analytics
 */
export function calculateGradeScore(analytics: {
  fillerRatePerMin: number;
  longestSilence: number;
  wingmanSuggestions: number;
  averageBattery: number;
}): number {
  let score = 100;

  // Filler penalty: up to -30 points
  score -= Math.min(analytics.fillerRatePerMin * 3, 30);

  // Silence penalty
  if (analytics.longestSilence > 10) {
    score -= 20;
  } else if (analytics.longestSilence > 5) {
    score -= 10;
  }

  // Assist penalty: -5 per suggestion
  score -= analytics.wingmanSuggestions * 5;

  // Battery penalty: up to -30 points based on how low average was
  score -= (100 - analytics.averageBattery) * 0.3;

  return Math.max(0, Math.min(100, Math.round(score)));
}
