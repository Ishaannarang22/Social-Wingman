"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ label, className, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn("glass-input", className)}
          {...props}
        />
      </div>
    );
  }
);

GlassInput.displayName = "GlassInput";
