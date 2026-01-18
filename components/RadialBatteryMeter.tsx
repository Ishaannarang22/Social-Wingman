"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

export interface RadialBatteryMeterProps {
  value: number; // 0-100
  size?: number; // diameter in pixels
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
  isCharging?: boolean;
  isCritical?: boolean;
}

export function RadialBatteryMeter({
  value,
  size = 280,
  strokeWidth = 12,
  className,
  showLabel = true,
  isCharging = false,
  isCritical = false,
}: RadialBatteryMeterProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  const { color, glowColor, statusText } = useMemo(() => {
    if (clampedValue >= 70) {
      return {
        color: "#22c55e", // battery-good
        glowColor: "rgba(34, 197, 94, 0.5)",
        statusText: "You're doing great!",
      };
    } else if (clampedValue >= 50) {
      return {
        color: "#eab308", // battery-medium
        glowColor: "rgba(234, 179, 8, 0.5)",
        statusText: "Keep the conversation going",
      };
    } else if (clampedValue >= 30) {
      return {
        color: "#f59e0b", // battery-low
        glowColor: "rgba(245, 158, 11, 0.5)",
        statusText: "Time to speak up!",
      };
    } else {
      return {
        color: "#ef4444", // battery-critical
        glowColor: "rgba(239, 68, 68, 0.6)",
        statusText: "Say something!",
      };
    }
  }, [clampedValue]);

  // SVG calculations for 270-degree arc
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // 270 degrees = 3/4 of the circle
  const arcLength = (270 / 360) * circumference;
  const dashOffset = arcLength - (clampedValue / 100) * arcLength;

  // Arc starts at 135 degrees (bottom-left) and goes 270 degrees clockwise
  const startAngle = 135;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* Glow effect layer */}
      <div
        className={cn(
          "absolute inset-0 rounded-full transition-opacity duration-300",
          isCritical && "animate-glow-pulse"
        )}
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          opacity: clampedValue < 30 ? 0.8 : 0.4,
        }}
      />

      {/* SVG Arc */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={cn(
          "transform -rotate-[135deg]",
          isCritical && "animate-shake"
        )}
      >
        {/* Background arc (gray track) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />

        {/* Foreground arc (colored fill) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="battery-arc"
          style={{
            filter: `drop-shadow(0 0 8px ${glowColor})`,
          }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showLabel && (
          <>
            <div
              className="font-mono text-5xl font-bold transition-colors duration-300"
              style={{ color }}
            >
              {Math.round(clampedValue)}%
            </div>
            <div className="mt-2 text-sm text-white/70 text-center px-8">
              {isCharging ? (
                <span className="text-green-400 flex items-center justify-center gap-1">
                  <Zap className="w-4 h-4" />
                  Keep going!
                </span>
              ) : (
                statusText
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
