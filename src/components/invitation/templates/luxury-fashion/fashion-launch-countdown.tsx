"use client";

import { useEffect, useState } from "react";
import styles from "./luxury-fashion-flagship.module.css";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function FashionLaunchCountdown({
  startAtIso,
  endAtIso,
  beforeLabel,
  afterLabel,
  endedLabel,
}: {
  startAtIso: string;
  endAtIso?: string;
  beforeLabel: string;
  afterLabel: string;
  endedLabel?: string;
}) {
  const start = Number.isNaN(Date.parse(startAtIso)) ? null : Date.parse(startAtIso);
  const end = endAtIso && !Number.isNaN(Date.parse(endAtIso)) ? Date.parse(endAtIso) : null;
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = start == null || now == null ? null : start - now;
  const ended = end != null && now != null && now >= end;
  const open = remaining != null && remaining <= 0;
  const value = remaining == null ? { days: 0, hours: 0, minutes: 0, seconds: 0 } : parts(remaining);

  return (
    <div data-testid="fashion-countdown" suppressHydrationWarning>
      <p className={styles.kicker}>{ended ? endedLabel || afterLabel : open ? afterLabel : beforeLabel}</p>
      {!open && !ended ? (
        <div className={styles.countdown} aria-live="polite">
          {(
            [
              ["Days", value.days],
              ["Hours", value.hours],
              ["Minutes", value.minutes],
              ["Seconds", value.seconds],
            ] as const
          ).map(([label, n]) => (
            <div key={label} className={styles.cell}>
              <strong suppressHydrationWarning>{now == null ? "—" : String(n).padStart(2, "0")}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.lede}>{ended ? endedLabel || afterLabel : afterLabel}</p>
      )}
    </div>
  );
}
