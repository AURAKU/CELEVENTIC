"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  ACTIVITY_RANGE_PRESETS,
  activityRangeFromDays,
  activityRangeFromPreset,
  defaultActivityRange,
  formatActivityRangeLabel,
  monthGrid,
  shiftMonth,
  toDayKey,
  type ActivityDateRange,
  type ActivityRangePreset,
} from "@/lib/digital-business-card/activity-range";
import styles from "./digital-card-analytics-panel.module.css";

const PRESET_LABEL: Record<ActivityRangePreset, string> = {
  today: "Today",
  "7d": "7 days",
  "30d": "30 days",
  month: "This month",
  all: "All time",
};

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function DigitalCardActivityRange({
  value,
  onChange,
}: {
  value: ActivityDateRange;
  onChange: (next: ActivityDateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date());
  const [draftFrom, setDraftFrom] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setDraftFrom(null);
    if (value.to) setMonth(new Date(`${value.to}T00:00:00`));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const days = useMemo(() => monthGrid(month), [month]);
  const label = formatActivityRangeLabel(value);
  const monthLabel = month.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  function pickDay(key: string) {
    if (!draftFrom) {
      setDraftFrom(key);
      const next = activityRangeFromDays(key, key);
      if (next) onChange(next);
      return;
    }
    const next = activityRangeFromDays(draftFrom, key);
    if (!next) return;
    onChange(next);
    setDraftFrom(null);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={styles.range}>
      <div className={styles.rangeChips} role="tablist" aria-label="Activity period">
        {ACTIVITY_RANGE_PRESETS.map((preset) => {
          const on = value.preset === preset;
          return (
            <button
              key={preset}
              type="button"
              role="tab"
              aria-selected={on}
              className={styles.rangeChip}
              data-on={on ? "true" : "false"}
              onClick={() => {
                onChange(activityRangeFromPreset(preset));
                setOpen(false);
              }}
            >
              {PRESET_LABEL[preset]}
            </button>
          );
        })}
        <button
          type="button"
          className={styles.rangeCal}
          data-on={value.preset === "custom" || open ? "true" : "false"}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label="Filter activity by date"
          onClick={() => setOpen((current) => !current)}
        >
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          <span>{label}</span>
        </button>
      </div>
      {open ? (
        <div className={styles.calendar} role="dialog" aria-label="Choose activity dates">
          <div className={styles.calHead}>
            <button type="button" onClick={() => setMonth((current) => shiftMonth(current, -1))} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p>{monthLabel}</p>
            <button type="button" onClick={() => setMonth((current) => shiftMonth(current, 1))} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className={styles.calWeek}>
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className={styles.calGrid}>
            {days.map((day) => {
              const start = draftFrom || value.from;
              const end = draftFrom && !value.to ? draftFrom : value.to || draftFrom;
              const selected = start && end && day.key >= start && day.key <= end;
              const edge = day.key === start || day.key === end;
              const today = day.key === toDayKey(new Date());
              return (
                <button
                  key={day.key}
                  type="button"
                  className={styles.calDay}
                  data-in={day.inMonth ? "true" : "false"}
                  data-selected={selected ? "true" : "false"}
                  data-edge={edge ? "true" : "false"}
                  data-today={today ? "true" : "false"}
                  aria-label={day.date.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  onClick={() => pickDay(day.key)}
                >
                  {day.date.getDate()}
                </button>
              );
            })}
          </div>
          <div className={styles.calFoot}>
            <p>Tap a start date, then an end date.</p>
            <button
              type="button"
              onClick={() => {
                onChange(defaultActivityRange());
                setOpen(false);
              }}
            >
              All time
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
