"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRESET_AVATARS } from "@/lib/avatars/preset-avatars";

interface AvatarPickerProps {
  value: string;
  onChange: (url: string) => void;
  className?: string;
}

export function AvatarPicker({ value, onChange, className }: AvatarPickerProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Selected avatar"
            className="h-14 w-14 rounded-full object-cover border border-slate-200 shadow-sm"
          />
        ) : (
          <div className="h-14 w-14 rounded-full border-2 border-dashed border-slate-200 bg-slate-50" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800">
            {PRESET_AVATARS.find((a) => a.url === value)?.label ?? "Choose an avatar"}
          </p>
          <p className="text-xs text-slate-500">
            {PRESET_AVATARS.length} unique styles — tap one to select
          </p>
        </div>
      </div>

      <div
        className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-64 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/60 p-2.5"
        role="listbox"
        aria-label="Avatar gallery"
      >
        {PRESET_AVATARS.map((avatar) => {
          const selected = value === avatar.url;
          return (
            <button
              key={avatar.id}
              type="button"
              role="option"
              aria-selected={selected}
              title={avatar.label}
              onClick={() => onChange(avatar.url)}
              className={cn(
                "relative aspect-square rounded-full overflow-hidden border-2 transition-all touch-manipulation",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40",
                selected
                  ? "border-brand-500 ring-2 ring-brand-500/30 scale-[1.04] shadow-md"
                  : "border-white hover:border-brand-300 hover:scale-[1.03] shadow-sm"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatar.url}
                alt={avatar.label}
                className="h-full w-full object-cover"
                draggable={false}
              />
              {selected && (
                <span className="absolute inset-0 flex items-center justify-center bg-brand-900/25">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-brand-700 shadow">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
