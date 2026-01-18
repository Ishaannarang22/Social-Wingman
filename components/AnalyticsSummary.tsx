"use client";

import { SessionAnalytics } from "@/types/analytics";

export interface AnalyticsSummaryProps {
  analytics: SessionAnalytics;
  onNewSession: () => void;
}

export function AnalyticsSummary({ analytics, onNewSession }: AnalyticsSummaryProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const getFillerRating = (rate: number) => {
    if (rate <= 3) return { text: "Excellent", color: "text-green-400" };
    if (rate <= 6) return { text: "Good", color: "text-green-400" };
    if (rate <= 10) return { text: "Average", color: "text-yellow-400" };
    return { text: "High", color: "text-red-400" };
  };

  const fillerRating = getFillerRating(analytics.fillerRatePerMin);

  // Sort fillers by count
  const sortedFillers = Object.entries(analytics.fillerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Session Complete</h1>
        <p className="text-gray-400">
          Here's how you did in your practice session
        </p>
      </div>

      {/* Main stats grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard
          label="Session Duration"
          value={formatDuration(analytics.sessionDuration)}
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Speaking Time"
          value={formatDuration(analytics.speakingTime)}
          subtext={`${Math.round(
            (analytics.speakingTime / analytics.sessionDuration) * 100
          )}% of session`}
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          }
        />
        <StatCard
          label="Filler Rate"
          value={`${analytics.fillerRatePerMin.toFixed(1)}/min`}
          subtext={fillerRating.text}
          subtextColor={fillerRating.color}
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
          }
        />
        <StatCard
          label="Wingman Assists"
          value={analytics.wingmanSuggestions.toString()}
          subtext={
            analytics.wingmanSuggestions === 0
              ? "No assistance needed!"
              : analytics.wingmanSuggestions <= 2
              ? "Minimal assistance"
              : "Keep practicing!"
          }
          icon={
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          }
        />
      </div>

      {/* Silence stats */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Pause Analysis</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-white">
              {formatDuration(analytics.longestSilence)}
            </div>
            <div className="text-xs text-gray-500">Longest Pause</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {formatDuration(analytics.averageSilence)}
            </div>
            <div className="text-xs text-gray-500">Avg Pause</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {analytics.silenceCount}
            </div>
            <div className="text-xs text-gray-500">Total Pauses</div>
          </div>
        </div>
      </div>

      {/* Filler breakdown */}
      {sortedFillers.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-300 mb-3">
            Top Filler Words ({analytics.totalFillers} total)
          </h3>
          <div className="space-y-2">
            {sortedFillers.map(([word, count]) => (
              <div key={word} className="flex items-center gap-3">
                <span className="text-gray-400 w-16 text-sm">"{word}"</span>
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500"
                    style={{
                      width: `${(count / analytics.totalFillers) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-gray-400 text-sm w-8">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Battery performance */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-8">
        <h3 className="text-sm font-medium text-gray-300 mb-3">
          Battery Performance
        </h3>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-white">
              {Math.round(analytics.averageBattery)}%
            </div>
            <div className="text-xs text-gray-500">Average Battery</div>
          </div>
          <div>
            <div
              className={`text-2xl font-bold ${
                analytics.minBattery < 25 ? "text-red-400" : "text-white"
              }`}
            >
              {Math.round(analytics.minBattery)}%
            </div>
            <div className="text-xs text-gray-500">Lowest Point</div>
          </div>
        </div>
        {analytics.timeInCritical > 0 && (
          <div className="mt-3 text-center text-sm text-red-400">
            Spent {formatDuration(analytics.timeInCritical)} in critical zone
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        <button
          onClick={onNewSession}
          className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Start New Session
        </button>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  subtextColor?: string;
  icon: React.ReactNode;
}

function StatCard({
  label,
  value,
  subtext,
  subtextColor = "text-gray-500",
  icon,
}: StatCardProps) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center gap-2 text-gray-400 mb-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subtext && (
        <div className={`text-xs mt-1 ${subtextColor}`}>{subtext}</div>
      )}
    </div>
  );
}
