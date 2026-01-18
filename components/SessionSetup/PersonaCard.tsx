"use client";

import { cn } from "@/lib/utils";
import {
  Code2,
  Briefcase,
  Target,
  Mic,
  Users,
  Check,
  Rocket,
  LucideIcon,
} from "lucide-react";

export interface PersonaCardProps {
  icon: LucideIcon;
  name: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}

const PERSONA_ICONS: Record<string, LucideIcon> = {
  hackathon_contact: Code2,
  recruiter: Briefcase,
  investor: Target,
  interviewer: Mic,
  peer: Users,
  startup_founder: Rocket,
};

export function getPersonaIcon(personaKey: string): LucideIcon {
  return PERSONA_ICONS[personaKey] || Users;
}

export function PersonaCard({
  icon: Icon,
  name,
  description,
  isSelected,
  onClick,
}: PersonaCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "persona-card text-left w-full",
        isSelected && "selected"
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
            isSelected
              ? "bg-[#7a9f6a]/20 text-[#7a9f6a]"
              : "bg-gray-200/60 text-gray-500"
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-display font-bold text-gray-800 mb-1">
            {name}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {description}
          </p>
        </div>
        {isSelected && (
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-primary/20 flex items-center justify-center">
            <Check className="w-4 h-4 text-accent-primary" />
          </div>
        )}
      </div>
    </button>
  );
}
