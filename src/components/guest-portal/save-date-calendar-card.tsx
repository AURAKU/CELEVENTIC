"use client";

import { CalendarPlus } from "lucide-react";
import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  downloadIcsFile,
  type CalendarEventInput,
} from "@/lib/invitation/calendar-utils";

interface SaveDateCalendarCardProps {
  event: CalendarEventInput;
  accentColor?: string;
}

export function SaveDateCalendarCard({ event, accentColor = "#0B8A83" }: SaveDateCalendarCardProps) {
  const d = new Date(event.startDateRaw);
  if (!event.startDateRaw || Number.isNaN(d.getTime())) return null;
  const month = d.toLocaleString("en", { month: "short" }).toUpperCase();
  const day = d.getDate();
  const weekday = d.toLocaleString("en", { weekday: "long" });
  const year = d.getFullYear();
  const time = d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit", hour12: true });

  return (
    <div className="inv-3d-scene max-w-sm mx-auto">
      <div className="inv-3d-calendar-card rounded-2xl overflow-hidden shadow-2xl border border-white/30">
        <div
          className="px-4 py-3 text-center text-white font-semibold tracking-[0.25em] text-xs uppercase"
          style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}99)` }}
        >
          Save the Date
        </div>
        <div className="bg-white px-6 py-8 text-center relative">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400 mb-1">{month}</p>
          <p className="font-display text-6xl font-bold text-slate-900 leading-none inv-3d-date-num">{day}</p>
          <p className="text-lg font-medium text-slate-700 mt-2">{weekday}</p>
          <p className="text-sm text-slate-500 mt-1">{year} · {time}</p>
          {event.venue && <p className="text-xs text-slate-500 mt-4 px-2 leading-relaxed">{event.venue}</p>}
          <p className="text-sm font-medium text-slate-800 mt-4 line-clamp-2">{event.title}</p>
        </div>
        <div className="p-3 bg-slate-50 border-t flex flex-wrap gap-2 justify-center">
          <a
            href={buildGoogleCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-100 transition-colors"
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Google
          </a>
          <a
            href={buildOutlookCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-100 transition-colors"
          >
            Outlook
          </a>
          <button
            type="button"
            onClick={() => downloadIcsFile(event)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-100 transition-colors"
          >
            Apple (.ics)
          </button>
        </div>
      </div>
    </div>
  );
}
