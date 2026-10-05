"use client";

import { useEffect, useId, useMemo, useRef, type KeyboardEvent } from "react";
import { ChevronDown } from "lucide-react";
import type { AureliaCeremony } from "@/lib/experience/aurelia-editorial";
import {
  buildMonthCells,
  calendarMonthFromHighlights,
  highlightedCeremonyDays,
} from "@/lib/experience/aurelia-editorial/hero-calendar";
import styles from "./aurelia-editorial-wedding.module.css";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

export function AureliaHeroCalendar({
  label,
  ceremonies,
  open,
  onOpenChange,
}: {
  label: string;
  ceremonies: readonly AureliaCeremony[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const dialogId = useId();
  const highlights = useMemo(() => highlightedCeremonyDays(ceremonies), [ceremonies]);
  const month = calendarMonthFromHighlights(highlights);
  const interactive = Boolean(month && highlights.length);
  const cells = useMemo(
    () => (month ? buildMonthCells(month.year, month.month) : []),
    [month]
  );
  const highlightKeys = useMemo(() => new Set(highlights.map((day) => day.key)), [highlights]);
  const monthTitle = month
    ? new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(
        new Date(Date.UTC(month.year, month.month, 1))
      )
    : "";

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  function onTriggerKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" && !open) {
      event.preventDefault();
      onOpenChange(true);
    }
  }

  if (!interactive) {
    return <p className={styles.heroDate}>{label}</p>;
  }

  return (
    <div className={styles.heroDateWrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.heroDate}
        aria-expanded={open}
        aria-controls={dialogId}
        aria-haspopup="dialog"
        onClick={() => onOpenChange(!open)}
        onKeyDown={onTriggerKey}
      >
        <span>{label}</span>
        <ChevronDown className={styles.heroDateCaret} size={16} strokeWidth={1.8} aria-hidden />
      </button>
      {open ? (
        <div
          className={styles.heroCal}
          id={dialogId}
          role="dialog"
          aria-label={`${monthTitle} celebration dates`}
        >
          <p className={styles.heroCalTitle}>{monthTitle}</p>
          <div className={styles.heroCalWeek} aria-hidden>
            {WEEKDAYS.map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className={styles.heroCalGrid}>
            {cells.map((cell, index) => {
              if (!cell.day || !cell.key) {
                return <span key={`empty-${index}`} className={styles.heroCalEmpty} />;
              }
              const marked = highlightKeys.has(cell.key);
              const match = highlights.find((day) => day.key === cell.key);
              return (
                <span
                  key={cell.key}
                  className={marked ? styles.heroCalMark : styles.heroCalDay}
                  data-marked={marked ? "true" : "false"}
                  aria-label={
                    marked
                      ? `${match?.weekday ?? ""} ${match?.dateLabel ?? cell.day}, ${match?.title ?? "celebration"}`
                      : undefined
                  }
                >
                  {cell.day}
                </span>
              );
            })}
          </div>
          <ul className={styles.heroCalLegend}>
            {highlights.map((day) => (
              <li key={day.key}>
                <span className={styles.heroCalLegendDay}>{padDay(day.day)}</span>
                <span>{day.title}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function padDay(value: number) {
  return String(value).padStart(2, "0");
}
