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
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      {options.map((type) => {
        const Icon = type.icon;
        const isSelected =
          selected?.id === type.id &&
          selected.joinIntent === type.joinIntent &&
          selected.queryKey === type.queryKey;
        return (
          <button
            key={`${type.id}-${type.joinIntent}-${type.queryKey}`}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(type)}
            aria-pressed={isSelected}
            className={`onboarding-intent-tile flex h-full min-h-[11.5rem] min-w-0 flex-col items-start rounded-2xl border-2 p-4 text-left transition-all touch-manipulation disabled:opacity-60 sm:p-5 ${
              isSelected
                ? "border-brand-500 bg-brand-50 shadow-[0_8px_24px_rgba(11,138,131,0.12)]"
                : "border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50"
            }`}
          >
            <div className="flex w-full min-w-0 items-start justify-between gap-3">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                <Icon className="h-5 w-5" />
              </div>
              {isSelected ? (
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
              ) : (
                <span className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              )}
            </div>
            <h3 className="onboarding-intent-tile__title mt-3 w-full min-w-0 text-base font-semibold leading-snug text-slate-900">
              {type.title}
            </h3>
            <p className="onboarding-intent-tile__body mt-1.5 w-full min-w-0 text-sm leading-snug text-slate-700">
              {type.description}
            </p>
            <p className="onboarding-intent-tile__body mt-2 w-full min-w-0 text-xs leading-snug text-slate-500">
              {type.example}
            </p>
          </button>
        );
      })}
    </div>
  );
}
