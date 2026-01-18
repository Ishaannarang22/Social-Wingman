"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

export interface DebugInfo {
  batteryValue: number;
  isDraining: boolean;
  isInGracePeriod: boolean;
  vadSpeaking: boolean;
  vadLevel: number;
  vadListening: boolean;
  silenceDuration: number;
  connectionState: string;
  agentState: string;
  wingmanCooldown: boolean;
  cooldownRemaining: number;
  coherenceIssue: string | null;
  recentTranscript: string;
  fillerRate: number;
}

export interface DebugDrawerProps {
  debugInfo: DebugInfo;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DebugDrawer({ debugInfo, isOpen, onOpenChange }: DebugDrawerProps) {
  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-surface-elevated border-t border-white/10">
        <DrawerHeader>
          <DrawerTitle className="text-white font-display">Debug Panel</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 max-h-[50vh] overflow-y-auto">
          <div className="space-y-4 font-mono text-xs">
            {/* Battery Section */}
            <DebugSection title="Battery">
              <DebugRow label="Value" value={`${debugInfo.batteryValue}%`} />
              <DebugRow
                label="Draining"
                value={debugInfo.isDraining ? "YES" : "NO"}
                valueClass={debugInfo.isDraining ? "text-red-400" : "text-green-400"}
              />
              <DebugRow
                label="Grace Period"
                value={debugInfo.isInGracePeriod ? "YES" : "NO"}
                valueClass={debugInfo.isInGracePeriod ? "text-yellow-400" : "text-white/70"}
              />
            </DebugSection>

            {/* VAD Section */}
            <DebugSection title="Voice Activity">
              <DebugRow
                label="Speaking"
                value={debugInfo.vadSpeaking ? "YES" : "NO"}
                valueClass={debugInfo.vadSpeaking ? "text-green-400" : "text-white/70"}
              />
              <DebugRow label="Level" value={`${(debugInfo.vadLevel * 100).toFixed(1)}%`} />
              <DebugRow
                label="Listening"
                value={debugInfo.vadListening ? "YES" : "NO"}
              />
              <DebugRow label="Silence" value={`${debugInfo.silenceDuration.toFixed(1)}s`} />
              {/* Audio level bar */}
              <div className="mt-2 h-2 bg-gray-700 rounded overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    debugInfo.vadSpeaking ? "bg-green-500" : "bg-red-500"
                  )}
                  style={{ width: `${Math.min(debugInfo.vadLevel * 500, 100)}%` }}
                />
              </div>
            </DebugSection>

            {/* Connection Section */}
            <DebugSection title="Connection">
              <DebugRow label="State" value={debugInfo.connectionState} />
              <DebugRow label="Agent" value={debugInfo.agentState} />
            </DebugSection>

            {/* Wingman Section */}
            <DebugSection title="Wingman">
              <DebugRow
                label="Status"
                value={debugInfo.wingmanCooldown ? `Cooldown ${debugInfo.cooldownRemaining}s` : "Ready"}
                valueClass={debugInfo.wingmanCooldown ? "text-yellow-400" : "text-green-400"}
              />
              <DebugRow label="Triggers at" value="<50% + 2s silence OR 5s silence" />
            </DebugSection>

            {/* Coherence Section */}
            {debugInfo.coherenceIssue && (
              <DebugSection title="Coherence">
                <p className="text-red-400">{debugInfo.coherenceIssue}</p>
              </DebugSection>
            )}

            {/* Transcript Section */}
            <DebugSection title="Transcript">
              <p className="text-cyan-400 truncate">
                {debugInfo.recentTranscript || "(empty)"}
              </p>
            </DebugSection>

            {/* Filler Section */}
            <DebugSection title="Fillers">
              <DebugRow
                label="Rate"
                value={`${debugInfo.fillerRate.toFixed(1)}/min`}
                valueClass={cn(
                  debugInfo.fillerRate > 10
                    ? "text-red-400"
                    : debugInfo.fillerRate > 6
                    ? "text-yellow-400"
                    : "text-green-400"
                )}
              />
            </DebugSection>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function DebugSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card p-3">
      <h3 className="text-accent-primary font-semibold mb-2">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function DebugRow({
  label,
  value,
  valueClass = "text-white",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-white/70">{label}:</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}
