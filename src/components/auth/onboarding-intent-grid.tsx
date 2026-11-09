"use client";

import { Check } from "lucide-react";
import type { OnboardingIntentOption } from "@/lib/auth/onboarding-intents";

export function OnboardingIntentGrid({
  options,
  selected,
  disabled,
  onSelect,
}: {
  options: OnboardingIntentOption[];
  selected: OnboardingIntentOption | null;
  disabled?: boolean;
  onSelect: (option: OnboardingIntentOption) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((type) => {
        const Icon = type.icon;
        const isSelected =
          selected?.id === type.id && selected.joinIntent === type.joinIntent;
        return (
          <button
            key={`${type.id}-${type.joinIntent}-${type.queryKey}`}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(type)}
            className={`text-left rounded-2xl border-2 p-4 sm:p-5 transition-all touch-manipulation min-h-[140px] disabled:opacity-60 ${
              isSelected
                ? "border-brand-500 bg-brand-50 shadow-[0_8px_24px_rgba(11,138,131,0.12)]"
                : "border-slate-200 hover:border-brand-300 hover:bg-slate-50 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="p-2.5 rounded-xl bg-brand-100 text-brand-700">
                <Icon className="h-5 w-5" />
              </div>
              {isSelected ? <Check className="h-5 w-5 text-brand-600 shrink-0" /> : null}
            </div>
            <h3 className="font-semibold mt-3 text-slate-900 text-base">{type.title}</h3>
            <p className="text-sm text-slate-700 mt-1 leading-relaxed">{type.description}</p>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">{type.example}</p>
          </button>
        );
      })}
    </div>
  );
}
