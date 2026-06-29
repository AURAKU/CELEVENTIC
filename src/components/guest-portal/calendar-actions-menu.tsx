"use client";

import { useState } from "react";
import { CalendarPlus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  downloadIcsFile,
  type CalendarEventInput,
} from "@/lib/invitation/calendar-utils";

interface CalendarActionsMenuProps {
  event: CalendarEventInput;
  accentColor?: string;
  variant?: "button" | "card" | "dark";
}

export function CalendarActionsMenu({ event, accentColor = "#0B8A83", variant = "button" }: CalendarActionsMenuProps) {
  const [open, setOpen] = useState(false);

  const options = [
    { id: "google", label: "Google Calendar", href: buildGoogleCalendarUrl(event) },
    { id: "outlook", label: "Outlook", href: buildOutlookCalendarUrl(event) },
    {
      id: "apple",
      label: "Apple Calendar (.ics)",
      action: () => downloadIcsFile(event, `${event.title.slice(0, 30).replace(/\s+/g, "-")}.ics`),
    },
  ];

  if (variant === "card") {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inv-3d-card w-full text-left p-4 rounded-2xl border border-white/20 bg-white/95 shadow-lg hover:shadow-xl transition-all touch-manipulation"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
              >
                <CalendarPlus className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-900">Save the Date</p>
                <p className="text-xs text-slate-500">Add to your calendar</p>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
          </div>
        </button>
        {open && (
          <div className="absolute z-20 mt-2 w-full rounded-xl border bg-white shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1">
            {options.map((opt) =>
              opt.href ? (
                <a
                  key={opt.id}
                  href={opt.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-3 text-sm hover:bg-slate-50 border-b last:border-0 text-slate-700"
                  onClick={() => setOpen(false)}
                >
                  {opt.label}
                </a>
              ) : (
                <button
                  key={opt.id}
                  type="button"
                  className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 border-b last:border-0 text-slate-700"
                  onClick={() => {
                    opt.action?.();
                    setOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              )
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <Button
        variant="outline"
        size="sm"
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={variant === "dark" ? "border-white/30 text-white hover:bg-white/10" : undefined}
      >
        <CalendarPlus className="h-4 w-4" />
        Save the Date
        <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
      {open && (
        <div className="absolute z-30 mt-1 left-0 min-w-[200px] rounded-xl border bg-white shadow-xl overflow-hidden">
          {options.map((opt) =>
            opt.href ? (
              <a
                key={opt.id}
                href={opt.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700"
                onClick={() => setOpen(false)}
              >
                {opt.label}
              </a>
            ) : (
              <button
                key={opt.id}
                type="button"
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700"
                onClick={() => {
                  opt.action?.();
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
