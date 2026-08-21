"use client";

import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { LiveCatalogTemplateGrid } from "@/components/invitation/live-template-catalog-grid";
import type { CatalogTemplate, InvitationCategory } from "@/lib/invitation-mvp/catalogue";

const ALL = "all" as const;

type EventFilter = typeof ALL | InvitationCategory;

function categoriesPresent(templates: CatalogTemplate[]): InvitationCategory[] {
  const order: InvitationCategory[] = [
    "Wedding",
    "Birthday",
    "Funeral",
    "Church",
    "Corporate",
    "Conference",
    "Concert",
    "Private Event",
  ];
  const present = new Set(templates.map((t) => t.category));
  return order.filter((c) => present.has(c));
}

export function PublicTemplatesCatalog({ templates }: { templates: CatalogTemplate[] }) {
  const [eventFilter, setEventFilter] = useState<EventFilter>(ALL);
  const eventOptions = useMemo(() => categoriesPresent(templates), [templates]);

  const filtered = useMemo(() => {
    if (eventFilter === ALL) return templates;
    return templates.filter((t) => t.category === eventFilter);
  }, [templates, eventFilter]);

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3 justify-center sm:justify-start">
          <Filter className="h-4 w-4 text-[#0B8A83]" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Filter by event
          </p>
        </div>
        <div
          className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin"
          role="toolbar"
          aria-label="Filter templates by event type"
        >
          <FilterChip
            label="All events"
            count={templates.length}
            active={eventFilter === ALL}
            onClick={() => setEventFilter(ALL)}
          />
          {eventOptions.map((category) => {
            const count = templates.filter((t) => t.category === category).length;
            return (
              <FilterChip
                key={category}
                label={category}
                count={count}
                active={eventFilter === category}
                onClick={() => setEventFilter(category)}
              />
            );
          })}
        </div>
        <p className="mt-3 text-center sm:text-left text-sm text-slate-500">
          Showing {filtered.length} of {templates.length} template
          {templates.length === 1 ? "" : "s"}
          {eventFilter !== ALL ? ` · ${eventFilter}` : ""}
        </p>
      </div>

      {filtered.length > 0 ? (
        <LiveCatalogTemplateGrid templates={filtered} />
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-16 text-center">
          <p className="font-semibold text-slate-900">No templates for this event type yet</p>
          <p className="mt-2 text-sm text-slate-500">Try another filter or view all events.</p>
          <button
            type="button"
            onClick={() => setEventFilter(ALL)}
            className="mt-4 text-sm font-semibold text-[#0B8A83] hover:underline"
          >
            Show all events
          </button>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors ${
        active
          ? "bg-[#0B8A83] text-white border-[#0B8A83] shadow-sm"
          : "bg-white text-slate-600 border-slate-200 hover:border-[#0B8A83]/50 hover:text-[#0B8A83]"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
