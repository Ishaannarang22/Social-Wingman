"use client";

import { cn } from "@/lib/utils";
import { Lightbulb, AlertTriangle, CheckCircle, LucideIcon } from "lucide-react";

export interface InsightCardProps {
  icon?: LucideIcon;
  title?: string;
  message: string;
  type?: "tip" | "warning" | "success";
  className?: string;
}

const TYPE_CONFIG: Record<
  "tip" | "warning" | "success",
  { border: string; iconBg: string; iconColor: string; DefaultIcon: LucideIcon }
> = {
  tip: {
    border: "border-[#7a9f6a]",
    iconBg: "bg-[#7a9f6a]/20",
    iconColor: "text-[#7a9f6a]",
    DefaultIcon: Lightbulb,
  },
  warning: {
    border: "border-yellow-500",
    iconBg: "bg-yellow-500/20",
    iconColor: "text-yellow-600",
    DefaultIcon: AlertTriangle,
  },
  success: {
    border: "border-green-500",
    iconBg: "bg-green-500/20",
    iconColor: "text-green-600",
    DefaultIcon: CheckCircle,
  },
};

export function InsightCard({
  icon,
  title,
  message,
  type = "tip",
  className,
}: InsightCardProps) {
  const config = TYPE_CONFIG[type];
  const Icon = icon || config.DefaultIcon;

  return (
    <div className={cn("insight-card", config.border, className)}>
      <div
        className={cn(
          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
          config.iconBg
        )}
      >
        <Icon className={cn("w-5 h-5", config.iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        {title && <h4 className="text-sm font-medium text-white mb-1">{title}</h4>}
        <p className="text-sm text-gray-300 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

/**
 * Generate insights based on session analytics
 */
export function generateInsights(analytics: {
  fillerCounts: Record<string, number>;
  fillerRatePerMin: number;
  totalFillers: number;
  longestSilence: number;
  wingmanSuggestions: number;
  averageBattery: number;
}): { message: string; type: "tip" | "warning" | "success" }[] {
  const insights: { message: string; type: "tip" | "warning" | "success" }[] = [];

  // Filler word insights
  if (analytics.fillerRatePerMin > 10) {
    const topFiller = Object.entries(analytics.fillerCounts)
      .sort((a, b) => b[1] - a[1])[0];
    if (topFiller) {
      insights.push({
        message: `You said "${topFiller[0]}" ${topFiller[1]} times. Try pausing silently instead of using filler words.`,
        type: "warning",
      });
    }
  } else if (analytics.fillerRatePerMin <= 3 && analytics.totalFillers > 0) {
    insights.push({
      message: "Great job minimizing filler words! Your speech sounded confident and clear.",
      type: "success",
    });
  }

  // Silence insights
  if (analytics.longestSilence > 10) {
    insights.push({
      message: "There were some long pauses. Keep questions ready to maintain conversation flow.",
      type: "tip",
    });
  }

  // Battery insights
  if (analytics.averageBattery > 70) {
    insights.push({
      message: "You kept the conversation energy high throughout the session!",
      type: "success",
    });
  } else if (analytics.averageBattery < 40) {
    insights.push({
      message: "Try speaking more during quiet moments to maintain conversation momentum.",
      type: "tip",
    });
  }

  // Wingman insights
  if (analytics.wingmanSuggestions === 0) {
    insights.push({
      message: "No assistance needed! You handled the conversation independently.",
      type: "success",
    });
  } else if (analytics.wingmanSuggestions > 3) {
    insights.push({
      message: "Practice having a few go-to questions ready to keep conversations flowing.",
      type: "tip",
    });
  }

  return insights.slice(0, 2); // Return max 2 insights
}
