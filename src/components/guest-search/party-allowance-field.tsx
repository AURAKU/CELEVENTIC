"use client";

import { Minus, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  MAX_PARTY_SIZE,
  MIN_PARTY_SIZE,
  PARTY_SIZE_PRESETS,
  clampPartySize,
} from "@/lib/guest-search/party-allowance";

/**
 * Party allowance control.
 *
 * A stepper rather than a free number field: the number decides how many
 * people the gate lets through, and a mistyped "12" instead of "2" is a
 * problem nobody discovers until the door. The presets exist because the
 * honest distribution of real answers is 1, 2 and "a table".
 */

interface PartyAllowanceFieldProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Explanation from name analysis, e.g. "Reads as a couple". */
  hint?: string | null;
  /** True when the name implies a size we cannot know — asks for confirmation. */
  needsConfirmation?: boolean;
  label?: string;
}

export function PartyAllowanceField({
  value,
  onChange,
  disabled,
  hint,
  needsConfirmation,
  label = "Number of people admitted",
}: PartyAllowanceFieldProps) {
  const set = (next: number) => onChange(clampPartySize(next, value));

  return (
    <div className="space-y-2">
      <Label htmlFor="party-allowance">{label}</Label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="One fewer person"
          onClick={() => set(value - 1)}
          disabled={disabled || value <= MIN_PARTY_SIZE}
          className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-slate-200 text-slate-600 transition-colors hover:border-brand-500/50 hover:bg-brand-50 disabled:pointer-events-none disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>

        <input
          id="party-allowance"
          type="number"
          inputMode="numeric"
          min={MIN_PARTY_SIZE}
          max={MAX_PARTY_SIZE}
          value={value}
          disabled={disabled}
          onChange={(e) => set(Number(e.target.value))}
          // Typing is allowed but the value is clamped on blur, so a stray
          // keystroke cannot leave "50" sitting in the field.
          onBlur={(e) => set(Number(e.target.value))}
          aria-describedby={hint ? "party-allowance-hint" : undefined}
          className="h-11 w-20 rounded-xl border-2 border-slate-200 text-center text-lg font-semibold tabular-nums focus:border-brand-500 focus:outline-none disabled:opacity-50"
        />

        <button
          type="button"
          aria-label="One more person"
          onClick={() => set(value + 1)}
          disabled={disabled || value >= MAX_PARTY_SIZE}
          className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-slate-200 text-slate-600 transition-colors hover:border-brand-500/50 hover:bg-brand-50 disabled:pointer-events-none disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>

        <div className="flex flex-wrap gap-1.5">
          {PARTY_SIZE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => set(preset)}
              disabled={disabled}
              aria-pressed={value === preset}
              className={`h-8 min-w-8 rounded-lg border px-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
                value === preset
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {hint && (
        <p
          id="party-allowance-hint"
          className={`text-xs ${needsConfirmation ? "text-amber-600" : "text-slate-500"}`}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
