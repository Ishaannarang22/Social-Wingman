"use client";

import { useState } from "react";
import {
  PARTNER_PERSONAS,
  PersonaKey,
  EVENT_TYPES,
  USER_ROLES,
} from "@/lib/wingmanPrompts";
import { SessionConfig } from "@/hooks/useSession";

export interface SessionSetupProps {
  onStart: (config: SessionConfig) => void;
  isConnecting?: boolean;
}

export function SessionSetup({ onStart, isConnecting = false }: SessionSetupProps) {
  const [userName, setUserName] = useState("");
  const [eventType, setEventType] = useState<string>("hackathon");
  const [userRole, setUserRole] = useState<string>("student");
  const [persona, setPersona] = useState<PersonaKey>("hackathon_contact");

  const handleStart = () => {
    if (!userName.trim()) {
      return;
    }

    onStart({
      userName: userName.trim(),
      eventType,
      userRole,
      persona,
    });
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Social Wingman</h1>
        <p className="text-gray-400">
          Practice conversations with AI assistance
        </p>
      </div>

      <div className="space-y-6">
        {/* Name input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Event type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Event Type
          </label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            {Object.entries(EVENT_TYPES).map(([key, description]) => (
              <option key={key} value={key}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {EVENT_TYPES[eventType as keyof typeof EVENT_TYPES]}
          </p>
        </div>

        {/* User role */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Your Role
          </label>
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            {Object.entries(USER_ROLES).map(([key, description]) => (
              <option key={key} value={key}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {USER_ROLES[userRole as keyof typeof USER_ROLES]}
          </p>
        </div>

        {/* Practice partner persona */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Practice Partner
          </label>
          <div className="grid grid-cols-1 gap-2">
            {Object.entries(PARTNER_PERSONAS).map(([key, value]) => (
              <button
                key={key}
                onClick={() => setPersona(key as PersonaKey)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  persona === key
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                }`}
              >
                <div className="font-medium text-white">{value.name}</div>
                <div className="text-xs text-gray-400">{value.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={!userName.trim() || isConnecting}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isConnecting ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Connecting...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Start Practice Session
            </>
          )}
        </button>
      </div>
    </div>
  );
}
