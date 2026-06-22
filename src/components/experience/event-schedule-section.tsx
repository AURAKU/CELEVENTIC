"use client";

import { Clock, MapPin } from "lucide-react";
import type { EventScheduleItem } from "@/lib/experience/experience-types";

interface EventScheduleSectionProps {
  items: EventScheduleItem[];
  accentColor?: string;
}

export function EventScheduleSection({ items, accentColor = "#0B8A83" }: EventScheduleSectionProps) {
  if (!items.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur p-6 shadow-sm">
      <h2 className="font-display text-lg font-bold text-[#0F172A] mb-4">Event Schedule</h2>
      <ol className="space-y-4">
        {items.map((item, i) => (
          <li
            key={item.id ?? i}
            className="relative pl-6 border-l-2 pb-1 last:pb-0"
            style={{ borderColor: `${accentColor}40` }}
          >
            <span
              className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white"
              style={{ background: accentColor }}
            />
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {item.time && (
                <span className="text-sm font-semibold tabular-nums" style={{ color: accentColor }}>
                  {item.time}
                </span>
              )}
              <span className="font-medium text-[#0F172A]">{item.title}</span>
            </div>
            {item.description && (
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">{item.description}</p>
            )}
            {item.location && (
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" style={{ color: accentColor }} />
                {item.location}
              </p>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[10px] uppercase tracking-widest text-slate-400 flex items-center gap-1">
        <Clock className="h-3 w-3" /> Times may be adjusted by the host
      </p>
    </div>
  );
}
