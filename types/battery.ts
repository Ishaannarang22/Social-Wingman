export interface BatteryState {
  value: number; // 0-100, clamped
  rawValue: number; // Before EMA smoothing
  lastUpdate: number; // Timestamp
  isDraining: boolean;
  isRecharging: boolean;
}

export interface BatteryConfig {
  // Drain rates
  silenceDrainRate: number; // Points per second during silence (default: -4)
  silenceGracePeriod: number; // Seconds before drain starts (default: 1.5)

  // Recharge rates
  speechRechargeAmount: number; // Points per valid speech segment (default: +12)

  // Filler penalties (points per second)
  fillerMildPenalty: number; // 6-10 fillers/min (default: -1)
  fillerHighPenalty: number; // >10 fillers/min (default: -2)

  // Thresholds
  fillerMildThreshold: number; // Fillers per minute for mild penalty (default: 6)
  fillerHighThreshold: number; // Fillers per minute for high penalty (default: 10)
  criticalThreshold: number; // Battery level considered critical (default: 25)

  // Smoothing
  emaAlpha: number; // Exponential moving average alpha (default: 0.3)
}

export interface BatteryUpdate {
  type: "battery";
  value: number;
}

export interface BatteryLowPoint {
  timestamp: number;
  value: number;
}

export const DEFAULT_BATTERY_CONFIG: BatteryConfig = {
  silenceDrainRate: 4,
  silenceGracePeriod: 1.5,
  speechRechargeAmount: 12,
  fillerMildPenalty: 1,
  fillerHighPenalty: 2,
  fillerMildThreshold: 6,
  fillerHighThreshold: 10,
  criticalThreshold: 25,
  emaAlpha: 0.3,
};
