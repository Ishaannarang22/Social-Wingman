"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { SocialBattery } from "@/lib/socialBattery";
import { BatteryState, BatteryConfig } from "@/types/battery";

export interface UseSocialBatteryOptions {
  config?: Partial<BatteryConfig>;
  onCritical?: (value: number) => void;
  updateIntervalMs?: number;
}

export interface UseSocialBatteryReturn {
  batteryValue: number;
  batteryState: BatteryState;
  isCritical: boolean;
  isInGracePeriod: boolean;
  startDraining: () => void;
  stopDraining: () => void;
  recordSpeech: () => void;
  applyFillerPenalty: (fillerRatePerMin: number) => void;
  reset: () => void;
  updateConfig: (config: Partial<BatteryConfig>) => void;
}

export function useSocialBattery(
  options: UseSocialBatteryOptions = {}
): UseSocialBatteryReturn {
  const { config, onCritical, updateIntervalMs = 100 } = options;

  const batteryRef = useRef<SocialBattery>(new SocialBattery(config));
  const [batteryValue, setBatteryValue] = useState(100);
  const [batteryState, setBatteryState] = useState<BatteryState>(
    batteryRef.current.getState()
  );

  const drainIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rechargeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isDrainingRef = useRef(false);
  const isRechargingRef = useRef(false);
  const lastUpdateRef = useRef(Date.now());
  const wasCriticalRef = useRef(false);

  // Update battery state
  const updateBatteryState = useCallback(() => {
    const state = batteryRef.current.getState();
    const value = batteryRef.current.getValue();
    setBatteryState(state);
    setBatteryValue(value);

    // Check for critical threshold crossing
    const isCriticalNow = batteryRef.current.isCritical();
    if (isCriticalNow && !wasCriticalRef.current && onCritical) {
      onCritical(value);
    }
    wasCriticalRef.current = isCriticalNow;
  }, [onCritical]);

  // Start draining (user is silent)
  const startDraining = useCallback(() => {
    if (isDrainingRef.current) return;

    // Stop recharging when we start draining
    if (isRechargingRef.current) {
      isRechargingRef.current = false;
      if (rechargeIntervalRef.current) {
        clearInterval(rechargeIntervalRef.current);
        rechargeIntervalRef.current = null;
      }
    }

    console.log("Battery: Starting drain interval");
    isDrainingRef.current = true;
    lastUpdateRef.current = Date.now();

    drainIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const deltaSeconds = (now - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = now;

      batteryRef.current.drain(deltaSeconds);
      updateBatteryState();
    }, updateIntervalMs);
  }, [updateIntervalMs, updateBatteryState]);

  // Stop draining
  const stopDraining = useCallback(() => {
    if (isDrainingRef.current) {
      console.log("Battery: Stopping drain interval");
    }
    isDrainingRef.current = false;
    if (drainIntervalRef.current) {
      clearInterval(drainIntervalRef.current);
      drainIntervalRef.current = null;
    }
  }, []);

  // Stop recharging
  const stopRecharging = useCallback(() => {
    if (isRechargingRef.current) {
      console.log("Battery: Stopping recharge interval");
    }
    isRechargingRef.current = false;
    if (rechargeIntervalRef.current) {
      clearInterval(rechargeIntervalRef.current);
      rechargeIntervalRef.current = null;
    }
  }, []);

  // Start recharging (user is speaking) - gradual recharge over time
  const startRecharging = useCallback(() => {
    if (isRechargingRef.current) return;

    stopDraining(); // Stop draining when we start recharging
    console.log("Battery: Starting recharge interval");
    isRechargingRef.current = true;
    lastUpdateRef.current = Date.now();

    // Reset silence tracking in the battery
    batteryRef.current.recharge(); // This resets silence tracking

    rechargeIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const deltaSeconds = (now - lastUpdateRef.current) / 1000;
      lastUpdateRef.current = now;

      // Recharge at ~8 points per second while speaking
      const rechargeAmount = 8 * deltaSeconds;
      const currentValue = batteryRef.current.getValue();
      if (currentValue < 100) {
        batteryRef.current.setRawValue(Math.min(100, currentValue + rechargeAmount));
      }
      updateBatteryState();
    }, updateIntervalMs);
  }, [stopDraining, updateIntervalMs, updateBatteryState]);

  // Record valid speech segment (now starts gradual recharge)
  const recordSpeech = useCallback(() => {
    startRecharging();
  }, [startRecharging]);

  // Apply filler penalty
  const applyFillerPenalty = useCallback(
    (fillerRatePerMin: number) => {
      const deltaSeconds = updateIntervalMs / 1000;
      batteryRef.current.applyFillerPenalty(fillerRatePerMin, deltaSeconds);
      updateBatteryState();
    },
    [updateIntervalMs, updateBatteryState]
  );

  // Reset battery
  const reset = useCallback(() => {
    stopDraining();
    stopRecharging();
    batteryRef.current.reset();
    wasCriticalRef.current = false;
    updateBatteryState();
  }, [stopDraining, stopRecharging, updateBatteryState]);

  // Update config
  const updateConfig = useCallback(
    (newConfig: Partial<BatteryConfig>) => {
      batteryRef.current.updateConfig(newConfig);
      updateBatteryState();
    },
    [updateBatteryState]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (drainIntervalRef.current) {
        clearInterval(drainIntervalRef.current);
      }
      if (rechargeIntervalRef.current) {
        clearInterval(rechargeIntervalRef.current);
      }
    };
  }, []);

  return {
    batteryValue,
    batteryState,
    isCritical: batteryRef.current.isCritical(),
    isInGracePeriod: batteryRef.current.isInGracePeriod(),
    startDraining,
    stopDraining,
    recordSpeech,
    applyFillerPenalty,
    reset,
    updateConfig,
  };
}
