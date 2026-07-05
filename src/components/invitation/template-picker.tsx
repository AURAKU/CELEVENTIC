"use client";

import { cn } from "@/lib/utils";
import type { InvitationTemplatePreset } from "@/lib/invitation-templates";
import { LiveTemplatePreview } from "@/components/invitation/live-template-preview";

interface TemplatePickerProps {
  templates: InvitationTemplatePreset[];
  selected: string;
  onSelect: (slug: string) => void;
  disabled?: boolean;
}

export function TemplatePicker({ templates, selected, onSelect, disabled }: TemplatePickerProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {templates.map((t) => (
        <button
          key={t.slug}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(t.slug)}
          className={cn(
            "relative rounded-xl border-2 overflow-hidden text-left transition-all hover:shadow-md bg-white",
            selected === t.slug ? "border-brand-500 ring-2 ring-teal-200" : "border-gray-200",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <LiveTemplatePreview
            layoutSlug={t.slug}
            category={t.category}
            variant="picker"
            showBadge={false}
            className="border-b border-slate-100"
          />
          <div className="p-2.5">
            <p className="text-xs font-semibold leading-tight">{t.name}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{t.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
