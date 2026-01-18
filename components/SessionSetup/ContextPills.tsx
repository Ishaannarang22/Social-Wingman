"use client";

import { cn } from "@/lib/utils";

export interface ContextPillsProps<T extends string> {
  options: { key: T; label: string }[];
  selected: T;
  onChange: (value: T) => void;
  label?: string;
}

export function ContextPills<T extends string>({
  options,
  selected,
  onChange,
  label,
}: ContextPillsProps<T>) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={cn(
              "context-pill",
              selected === option.key && "active"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
