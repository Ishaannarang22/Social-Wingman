"use client";

import { useMemo } from "react";

export interface BatteryMeterProps {
  value: number; // 0-100
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function BatteryMeter({
  value,
  showLabel = false,
  size = "md",
  className = "",
}: BatteryMeterProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  const { color, bgColor, glowColor } = useMemo(() => {
    if (clampedValue >= 70) {
      return {
        color: "bg-green-500",
        bgColor: "bg-green-500/20",
        glowColor: "shadow-green-500/50",
      };
    } else if (clampedValue >= 30) {
      return {
        color: "bg-yellow-500",
        bgColor: "bg-yellow-500/20",
        glowColor: "shadow-yellow-500/50",
      };
    } else {
      return {
        color: "bg-red-500",
        bgColor: "bg-red-500/20",
        glowColor: "shadow-red-500/50",
      };
    }
  }, [clampedValue]);

  const sizeClasses = {
    sm: "h-2 rounded",
    md: "h-3 rounded-md",
    lg: "h-4 rounded-lg",
  };

  const containerClasses = {
    sm: "w-24",
    md: "w-32",
    lg: "w-48",
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`${containerClasses[size]} ${bgColor} ${sizeClasses[size]} overflow-hidden`}
      >
        <div
          className={`battery-fill h-full ${color} ${
            clampedValue < 30 ? `shadow-lg ${glowColor}` : ""
          } ${clampedValue < 20 ? "animate-pulse" : ""}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <span
          className={`text-xs font-medium tabular-nums ${
            clampedValue < 30 ? "text-red-400" : "text-gray-400"
          }`}
        >
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  );
}
