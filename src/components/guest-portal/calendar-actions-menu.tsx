"use client";

import { Bell } from "lucide-react";
import type { CalendarEventInput } from "@/lib/invitation/calendar-utils";
import { SetReminderButton } from "@/components/guest-portal/set-reminder-button";

interface CalendarActionsMenuProps {
  event: CalendarEventInput;
  accentColor?: string;
  secondaryColor?: string;
  variant?: "button" | "card" | "dark";
}

/** Single smart reminder action — replaces Google / Outlook / Apple menu. */
export function CalendarActionsMenu({
  event,
  accentColor = "#0B8A83",
  secondaryColor = "#D4A63A",
  variant = "button",
}: CalendarActionsMenuProps) {
  if (variant === "card") {
    return (
      <div className="inv-3d-card w-full p-4 rounded-2xl border border-white/20 bg-white/95 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
          >
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-900">Save the Date</p>
            <p className="text-xs text-slate-500">Smart calendar reminder</p>
          </div>
        </div>
        <SetReminderButton
          event={event}
          accentColor={accentColor}
          secondaryColor={secondaryColor}
          variant="cta"
          fullWidth
        />
      </div>
    );
  }

  return (
    <SetReminderButton
      event={event}
      accentColor={accentColor}
      secondaryColor={secondaryColor}
      variant={variant === "dark" ? "dark" : "pill"}
    />
  );
}
