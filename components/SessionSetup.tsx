"use client";

import { useState } from "react";
import {
  PARTNER_PERSONAS,
  PersonaKey,
  EVENT_TYPES,
  USER_ROLES,
} from "@/lib/wingmanPrompts";
import { SessionConfig } from "@/hooks/useSession";
import { PersonaCard, getPersonaIcon, ContextPills, GlassInput } from "./SessionSetup/index";
import { PlayCircle, Loader2 } from "lucide-react";

export interface SessionSetupProps {
  onStart: (config: SessionConfig) => void;
  isConnecting?: boolean;
}

const EVENT_OPTIONS = ["hackathon", "networking", "conference"].map((key) => ({
  key: key,
  label: key.charAt(0).toUpperCase() + key.slice(1),
}));

const ROLE_OPTIONS = ["student", "founder", "engineer"].map((key) => ({
  key: key,
  label: key.charAt(0).toUpperCase() + key.slice(1),
}));

// Filter personas for demo
const DEMO_PERSONAS: PersonaKey[] = ["hackathon_contact", "startup_founder"];

export function SessionSetup({ onStart, isConnecting = false }: SessionSetupProps) {
  const [userName, setUserName] = useState("ishaan");
  const [eventType, setEventType] = useState<string>("hackathon");
  const [userRole, setUserRole] = useState<string>("student");
  const [persona, setPersona] = useState<PersonaKey>("hackathon_contact");

  const handleStart = () => {
    onStart({
      userName,
      eventType,
      userRole,
      persona,
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6">
      {/* Hero Header */}
      <div className="text-center mb-6">
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-display font-bold mb-3 tracking-tight leading-none">
          <span className="text-gray-900">Social</span>{" "}
          <span className="text-[#7a9f6a]">Cue</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600">
          Practice conversations with your AI partner
        </p>
      </div>

      <div className="space-y-4">
        {/* Context Options - Moved to top */}
        <div className="flex flex-col sm:flex-row gap-4">
          <ContextPills
            label="Event Type"
            options={EVENT_OPTIONS}
            selected={eventType}
            onChange={setEventType}
          />

          <ContextPills
            label="Your Role"
            options={ROLE_OPTIONS}
            selected={userRole}
            onChange={setUserRole}
          />
        </div>

        {/* Choose Practice Partner Section */}
        <div>
          <h2 className="text-lg font-display font-semibold text-gray-800 mb-3">
            Choose Your Practice Partner
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEMO_PERSONAS.map((key) => (
              <PersonaCard
                key={key}
                icon={getPersonaIcon(key)}
                name={PARTNER_PERSONAS[key].name}
                description={PARTNER_PERSONAS[key].description}
                isSelected={persona === key}
                onClick={() => setPersona(key)}
              />
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={isConnecting}
          className="btn-primary w-full flex items-center justify-center gap-3 text-lg"
        >
          {isConnecting ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <PlayCircle className="w-6 h-6" />
              Start Session
            </>
          )}
        </button>
      </div>
    </div>
  );
}
