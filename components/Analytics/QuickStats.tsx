"use client";

import { cn } from "@/lib/utils";

export interface QuickStat {
  label: string;
  value: string;
  subtext?: string;
}

export interface QuickStatsProps {
  stats: QuickStat[];
  className?: string;
}

export function QuickStats({ stats, className }: QuickStatsProps) {
  return (
    <div className={cn("flex justify-center gap-2 sm:gap-4", className)}>
      {stats.map((stat, index) => (
        <div key={index} className="bg-white/60 rounded-xl border border-gray-200 p-2.5 sm:p-4 text-center min-w-[80px] sm:min-w-[100px] flex-1 max-w-[120px] sm:max-w-none sm:flex-none backdrop-blur-sm">
          <div className="text-lg sm:text-2xl font-mono font-bold text-gray-800">
            {stat.value}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-500 mt-1">{stat.label}</div>
          {stat.subtext && (
            <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5">{stat.subtext}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Format duration in seconds to human readable string
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}
