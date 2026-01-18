"use client";

import { useState, useMemo } from "react";
import { SessionAnalytics } from "@/types/analytics";
import {
  GradeHero,
  calculateGradeScore,
  QuickStats,
  formatDuration,
  InsightCard,
  generateInsights,
} from "./Analytics";
import { ChevronDown, RotateCcw } from "lucide-react";

export interface AnalyticsSummaryProps {
  analytics: SessionAnalytics;
  onNewSession: () => void;
}

export function AnalyticsSummary({ analytics, onNewSession }: AnalyticsSummaryProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Calculate grade score
  const gradeScore = useMemo(
    () =>
      calculateGradeScore({
        fillerRatePerMin: analytics.fillerRatePerMin,
        longestSilence: analytics.longestSilence,
        wingmanSuggestions: analytics.wingmanSuggestions,
        averageBattery: analytics.averageBattery,
      }),
    [analytics]
  );

  // Generate insights
  const insights = useMemo(
    () =>
      generateInsights({
        fillerCounts: analytics.fillerCounts,
        fillerRatePerMin: analytics.fillerRatePerMin,
        totalFillers: analytics.totalFillers,
        longestSilence: analytics.longestSilence,
        wingmanSuggestions: analytics.wingmanSuggestions,
        averageBattery: analytics.averageBattery,
      }),
    [analytics]
  );

  // Quick stats data
  const quickStats = useMemo(
    () => [
      {
        label: "Duration",
        value: formatDuration(analytics.sessionDuration),
      },
      {
        label: "Fillers",
        value: `${analytics.fillerRatePerMin.toFixed(1)}/min`,
      },
      {
        label: "Assists",
        value: analytics.wingmanSuggestions.toString(),
      },
    ],
    [analytics]
  );

  // Sort fillers by count for detailed view
  const sortedFillers = useMemo(
    () =>
      Object.entries(analytics.fillerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    [analytics.fillerCounts]
  );

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-gray-800 mb-2">
          Session Complete
        </h1>
      </div>

      {/* Grade Hero */}
      <GradeHero score={gradeScore} className="mb-6 sm:mb-8" />

      {/* Quick Stats */}
      <QuickStats stats={quickStats} className="mb-6 sm:mb-8" />

      {/* View Details Toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center justify-center gap-2 text-white/70 hover:text-white transition-colors mb-6"
      >
        <span className="text-sm">{showDetails ? "Hide" : "View"} Detailed Stats</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`}
        />
      </button>

      {/* Detailed Stats (Collapsible) */}
      {showDetails && (
        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 animate-fade-in">
          {/* Speaking Time */}
          <div className="glass-card p-3 sm:p-4">
            <h3 className="text-xs sm:text-sm font-medium text-white/70 mb-2 sm:mb-3">Time Breakdown</h3>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
              <div>
                <div className="text-base sm:text-xl font-mono font-bold text-white">
                  {formatDuration(analytics.speakingTime)}
                </div>
                <div className="text-[10px] sm:text-xs text-white/55">Speaking</div>
              </div>
              <div>
                <div className="text-base sm:text-xl font-mono font-bold text-white">
                  {formatDuration(analytics.silenceTime)}
                </div>
                <div className="text-[10px] sm:text-xs text-white/55">Silence</div>
              </div>
              <div>
                <div className="text-base sm:text-xl font-mono font-bold text-white">
                  {analytics.sessionDuration > 0
                    ? Math.round((analytics.speakingTime / analytics.sessionDuration) * 100)
                    : 0}%
                </div>
                <div className="text-[10px] sm:text-xs text-white/55">Talk Ratio</div>
              </div>
            </div>
          </div>

          {/* Pause Analysis */}
          <div className="glass-card p-3 sm:p-4">
            <h3 className="text-xs sm:text-sm font-medium text-white/70 mb-2 sm:mb-3">Pause Analysis</h3>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
              <div>
                <div className="text-base sm:text-xl font-mono font-bold text-white">
                  {formatDuration(analytics.longestSilence)}
                </div>
                <div className="text-[10px] sm:text-xs text-white/55">Longest</div>
              </div>
              <div>
                <div className="text-base sm:text-xl font-mono font-bold text-white">
                  {formatDuration(analytics.averageSilence)}
                </div>
                <div className="text-[10px] sm:text-xs text-white/55">Average</div>
              </div>
              <div>
                <div className="text-base sm:text-xl font-mono font-bold text-white">
                  {analytics.silenceCount}
                </div>
                <div className="text-[10px] sm:text-xs text-white/55">Total Pauses</div>
              </div>
            </div>
          </div>

          {/* Filler Breakdown */}
          {sortedFillers.length > 0 && (
            <div className="glass-card p-3 sm:p-4">
              <h3 className="text-xs sm:text-sm font-medium text-white/70 mb-2 sm:mb-3">
                Filler Words ({analytics.totalFillers} total)
              </h3>
              <div className="space-y-2">
                {sortedFillers.map(([word, count]) => (
                  <div key={word} className="flex items-center gap-2 sm:gap-3">
                    <span className="text-white/70 w-12 sm:w-16 text-xs sm:text-sm font-mono">"{word}"</span>
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500 to-amber-500"
                        style={{
                          width: `${(count / analytics.totalFillers) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-white/70 text-xs sm:text-sm font-mono w-6 sm:w-8 text-right">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Battery Performance */}
          <div className="glass-card p-3 sm:p-4">
            <h3 className="text-xs sm:text-sm font-medium text-white/70 mb-2 sm:mb-3">Battery Performance</h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-4 text-center">
              <div>
                <div className="text-base sm:text-xl font-mono font-bold text-white">
                  {Math.round(analytics.averageBattery)}%
                </div>
                <div className="text-[10px] sm:text-xs text-white/55">Average</div>
              </div>
              <div>
                <div
                  className={`text-base sm:text-xl font-mono font-bold ${
                    analytics.minBattery < 25 ? "text-red-400" : "text-white"
                  }`}
                >
                  {Math.round(analytics.minBattery)}%
                </div>
                <div className="text-[10px] sm:text-xs text-white/55">Lowest</div>
              </div>
            </div>
            {analytics.timeInCritical > 0 && (
              <div className="mt-2 sm:mt-3 text-center text-xs sm:text-sm text-red-400/80">
                Spent {formatDuration(analytics.timeInCritical)} in critical zone
              </div>
            )}
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
          {insights.map((insight, index) => (
            <InsightCard key={index} message={insight.message} type={insight.type} />
          ))}
        </div>
      )}

      {/* Practice Again Button */}
      <button onClick={onNewSession} className="btn-primary w-full text-base sm:text-lg flex items-center justify-center gap-2">
        <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
        Practice Again
      </button>
    </div>
  );
}
