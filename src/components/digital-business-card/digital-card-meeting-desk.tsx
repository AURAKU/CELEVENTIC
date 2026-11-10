"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import {
  MEETING_DURATIONS,
  MEETING_PLACES,
  MEETING_TIMEZONES,
  MEETING_WEEKDAYS,
  defaultMeetingDesk,
  guessMeetingTimezone,
  meetingDurationCopy,
  type CeleCardMeetingDesk,
} from "@/lib/digital-business-card/meetings";

const HOURS = Array.from({ length: 16 }, (_, index) => index + 7);

function Chip({
  on,
  children,
  onClick,
  accent,
}: {
  on: boolean;
  children: string;
  onClick: () => void;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]"
      style={{
        borderColor: on ? accent : "rgba(0,0,0,0.12)",
        background: on ? accent : "transparent",
        color: on ? "#fff" : accent,
      }}
    >
      {children}
    </button>
  );
}

export function DigitalCardMeetingDesk({
  value,
  onChange,
  accent = "#0B8A83",
  inputClassName,
  inputStyle,
}: {
  value?: CeleCardMeetingDesk | null;
  onChange: (next: CeleCardMeetingDesk) => void;
  accent?: string;
  inputClassName?: string;
  inputStyle?: CSSProperties;
}) {
  const desk = value ?? defaultMeetingDesk({ timezone: guessMeetingTimezone() });
  const zones = MEETING_TIMEZONES.includes(desk.timezone as (typeof MEETING_TIMEZONES)[number])
    ? MEETING_TIMEZONES
    : ([desk.timezone, ...MEETING_TIMEZONES] as string[]);

  function patch(partial: Partial<CeleCardMeetingDesk>) {
    onChange({ ...desk, ...partial });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        role="switch"
        aria-checked={desk.enabled}
        onClick={() => patch({ enabled: !desk.enabled })}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left"
        style={{ borderColor: desk.enabled ? accent : "rgba(0,0,0,0.12)" }}
      >
        <span>
          <span className="block text-sm font-semibold" style={{ color: accent }}>
            Guests can book a time
          </span>
          <span className="mt-0.5 block text-xs text-stone-500">
            They pick a date and time. You get a message in your inbox.
          </span>
        </span>
        <span
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition",
            desk.enabled ? "bg-current" : "bg-stone-300"
          )}
          style={desk.enabled ? { color: accent } : undefined}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition",
              desk.enabled ? "left-5" : "left-0.5"
            )}
          />
        </span>
      </button>
      {desk.enabled ? (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
              What guests see
            </span>
            <input
              value={desk.title}
              onChange={(event) => patch({ title: event.target.value })}
              placeholder="Book a sitting, intro call, or fitting"
              className={cn("min-w-0 w-full", inputClassName)}
              style={inputStyle}
            />
          </label>
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Length</p>
            <div className="flex flex-wrap gap-1.5">
              {MEETING_DURATIONS.map((minutes) => (
                <Chip
                  key={minutes}
                  on={desk.durationMin === minutes}
                  accent={accent}
                  onClick={() => patch({ durationMin: minutes })}
                >
                  {meetingDurationCopy(minutes)}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Days</p>
            <div className="flex flex-wrap gap-1.5">
              {MEETING_WEEKDAYS.map((day) => {
                const on = desk.weekdays.includes(day.id);
                return (
                  <Chip
                    key={day.id}
                    on={on}
                    accent={accent}
                    onClick={() =>
                      patch({
                        weekdays: on
                          ? desk.weekdays.filter((value) => value !== day.id)
                          : [...desk.weekdays, day.id].sort((a, b) => a - b),
                      })
                    }
                  >
                    {day.label}
                  </Chip>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                From
              </span>
              <select
                value={desk.startHour}
                onChange={(event) => patch({ startHour: Number(event.target.value) })}
                className={cn("min-w-0 w-full", inputClassName)}
                style={inputStyle}
              >
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>
                    {String(hour).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                To
              </span>
              <select
                value={desk.endHour}
                onChange={(event) => patch({ endHour: Number(event.target.value) })}
                className={cn("min-w-0 w-full", inputClassName)}
                style={inputStyle}
              >
                {HOURS.filter((hour) => hour > desk.startHour).map((hour) => (
                  <option key={hour} value={hour}>
                    {String(hour).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Place</p>
            <div className="flex flex-wrap gap-1.5">
              {MEETING_PLACES.map((place) => (
                <Chip key={place} on={desk.place === place} accent={accent} onClick={() => patch({ place })}>
                  {place}
                </Chip>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
              Time zone
            </span>
            <select
              value={desk.timezone}
              onChange={(event) => patch({ timezone: event.target.value })}
              className={cn("min-w-0 w-full", inputClassName)}
              style={inputStyle}
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
              Note guests see
            </span>
            <input
              value={desk.note}
              onChange={(event) => patch({ note: event.target.value })}
              placeholder="I’ll confirm and send a link"
              className={cn("min-w-0 w-full", inputClassName)}
              style={inputStyle}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
