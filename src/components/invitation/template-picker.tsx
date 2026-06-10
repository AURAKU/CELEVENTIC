"use client";

import { cn } from "@/lib/utils";
import type { InvitationTemplatePreset } from "@/lib/invitation-templates";

interface TemplatePickerProps {
  templates: InvitationTemplatePreset[];
  selected: string;
  onSelect: (slug: string) => void;
  disabled?: boolean;
}

export function TemplatePicker({ templates, selected, onSelect, disabled }: TemplatePickerProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {templates.map((t) => (
        <button
          key={t.slug}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(t.slug)}
          className={cn(
            "relative rounded-xl border-2 overflow-hidden text-left transition-all hover:shadow-md",
            selected === t.slug ? "border-brand-500 ring-2 ring-teal-200" : "border-gray-200",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className={`h-24 bg-gradient-to-br ${t.preview.gradient} relative`}>
            <div
              className="absolute inset-3 border rounded-sm opacity-60"
              style={{ borderColor: t.preview.accent }}
            />
            <div className="absolute bottom-2 left-2 right-2">
              <div className="h-1 rounded" style={{ backgroundColor: t.preview.accent, opacity: 0.8 }} />
              <div className="h-0.5 mt-1 rounded bg-white/40 w-2/3" />
            </div>
          </div>
          <div className="p-2.5">
            <p className="text-xs font-semibold leading-tight">{t.name}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{t.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
