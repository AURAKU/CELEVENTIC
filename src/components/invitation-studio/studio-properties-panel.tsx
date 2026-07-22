"use client";

import { cn } from "@/lib/utils";

export type StudioPropCategory =
  | "look"
  | "experience"
  | "motion"
  | "buttons"
  | "music"
  | "template";

const CATEGORIES: { id: StudioPropCategory; label: string }[] = [
  { id: "template", label: "Template" },
  { id: "look", label: "Look" },
  { id: "experience", label: "Experience" },
  { id: "motion", label: "Motion" },
  { id: "buttons", label: "Buttons" },
  { id: "music", label: "Music" },
];

interface StudioPropertiesPanelProps {
  category: StudioPropCategory;
  onCategoryChange: (c: StudioPropCategory) => void;
  children: React.ReactNode;
  selectedSceneLabel?: string | null;
}

export function StudioPropertiesPanel({
  category,
  onCategoryChange,
  children,
  selectedSceneLabel,
}: StudioPropertiesPanelProps) {
  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-slate-200/80 bg-white">
      <div className="border-b border-slate-100 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Properties
        </p>
        {selectedSceneLabel && (
          <p className="mt-0.5 truncate text-sm font-medium text-[#0F172A]">
            {selectedSceneLabel}
          </p>
        )}
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-2 py-1.5 scrollbar-thin">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onCategoryChange(c.id)}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
              category === c.id
                ? "bg-[#0B8A83] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-4">{children}</div>
    </aside>
  );
}

export function PropSection({
  title,
  icon,
  children,
  accent,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border p-4 space-y-3",
        accent
          ? "border-[#D4A63A]/40 bg-gradient-to-br from-[#D4A63A]/5 to-white"
          : "border-slate-200 bg-white"
      )}
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}
