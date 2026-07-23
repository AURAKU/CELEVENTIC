"use client";

import { cn } from "@/lib/utils";
import {
  QR_DEFAULT_LOGO_SIZE,
  QR_LOGO_SIZE_LABELS,
  QR_LOGO_SIZE_PRESETS,
  type QrLogoSizePreset,
} from "@/lib/qr/qr-constants";

const PRESETS = Object.keys(QR_LOGO_SIZE_PRESETS) as QrLogoSizePreset[];

interface QrLogoSizeControlProps {
  value: QrLogoSizePreset;
  onChange: (value: QrLogoSizePreset) => void;
  disabled?: boolean;
  className?: string;
}

/** Subtle / Balanced / Bold presets for branded QR center logo inset */
export function QrLogoSizeControl({
  value = QR_DEFAULT_LOGO_SIZE,
  onChange,
  disabled,
  className,
}: QrLogoSizeControlProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">Logo size</p>
        <p className="text-[11px] text-slate-400">
          {Math.round(QR_LOGO_SIZE_PRESETS[value] * 100)}% · stays scannable
        </p>
      </div>
      <div
        className="grid grid-cols-3 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1"
        role="radiogroup"
        aria-label="QR center logo size"
      >
        {PRESETS.map((preset) => {
          const active = value === preset;
          return (
            <button
              key={preset}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(preset)}
              className={cn(
                "rounded-lg px-2 py-2 text-xs font-semibold transition-colors touch-manipulation min-h-[40px]",
                active
                  ? "bg-white text-brand-700 shadow-sm ring-1 ring-brand-200"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-900",
                disabled && "opacity-50 pointer-events-none"
              )}
            >
              {QR_LOGO_SIZE_LABELS[preset]}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        Your full logo stays visible inside the white inset (never cropped). Bold is the maximum safe
        size with high error correction — prefer Balanced for print and gates.
      </p>
    </div>
  );
}
