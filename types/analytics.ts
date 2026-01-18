import { BatteryLowPoint } from "./battery";

export interface FillerStats {
  [word: string]: number;
}

export interface SessionAnalytics {
  // Timing
  sessionDuration: number; // Total session time in seconds
  speakingTime: number; // Total time user was speaking
  silenceTime: number; // Total time of silence/pauses
  partnerSpeakingTime: number; // Total time partner was speaking

  // Fillers
  fillerCounts: FillerStats;
  totalFillers: number;
  fillerRatePerMin: number;

  // Silences
  longestSilence: number; // Longest awkward pause in seconds
  averageSilence: number; // Average pause duration
  silenceCount: number; // Number of significant pauses

  // Battery
  batteryLowPoints: BatteryLowPoint[];
  averageBattery: number;
  minBattery: number;
  timeInCritical: number; // Seconds spent below critical threshold

  // Wingman interventions
  wingmanSuggestions: number;
  suggestionsUsed: number; // If we can track this

  // Topics (optional, from LLM analysis)
  topicsDiscussed: string[];
}

export interface WingmanSuggestion {
  type: "suggestion";
  text: string;
  timestamp: number;
  triggeredBy: "low_battery" | "long_silence" | "incoherent";
}

export interface StateUpdate {
  type: "state";
  value: "listening" | "speaking" | "partner_speaking" | "idle" | "connecting";
}

export interface StatsMessage {
  type: "stats";
  fillers: FillerStats;
  filler_rate_per_min: number;
  longest_silence_sec: number;
  total_silence_sec: number;
  speaking_time_sec: number;
  battery_low_points: BatteryLowPoint[];
}

export const createEmptyAnalytics = (): SessionAnalytics => ({
  sessionDuration: 0,
  speakingTime: 0,
  silenceTime: 0,
  partnerSpeakingTime: 0,
  fillerCounts: {},
  totalFillers: 0,
  fillerRatePerMin: 0,
  longestSilence: 0,
  averageSilence: 0,
  silenceCount: 0,
  batteryLowPoints: [],
  averageBattery: 100,
  minBattery: 100,
  timeInCritical: 0,
  wingmanSuggestions: 0,
  suggestionsUsed: 0,
  topicsDiscussed: [],
});
