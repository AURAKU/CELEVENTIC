"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  compactMeetingDesk,
  defaultMeetingDesk,
  downloadMeetingIcs,
  formatMeetingWhen,
  guessMeetingTimezone,
  listOpenMeetingSlots,
  meetingIcs,
  meetingSubtitle,
  type CeleCardMeetingDesk,
  type CeleCardMeetingSlot,
} from "@/lib/digital-business-card/meetings";
import type { DigitalCardReachItem } from "@/lib/digital-business-card/socials";
import type { DigitalCardTheme } from "@/lib/digital-business-card/themes";

function deskFromItem(item: DigitalCardReachItem): CeleCardMeetingDesk {
  try {
    return compactMeetingDesk(JSON.parse(item.copyValue || "{}")) ?? defaultMeetingDesk({ enabled: true, title: item.title });
  } catch {
    return defaultMeetingDesk({ enabled: true, title: item.title });
  }
}

function groupSlots(slots: CeleCardMeetingSlot[]) {
  const days: Array<{ key: string; weekday: string; label: string; slots: CeleCardMeetingSlot[] }> = [];
  for (const slot of slots) {
    const current = days[days.length - 1];
    if (!current || current.key !== slot.dayKey) {
      days.push({ key: slot.dayKey, weekday: slot.weekday, label: slot.dayLabel, slots: [slot] });
    } else {
      current.slots.push(slot);
    }
  }
  return days;
}

export function DigitalCardMeetingDrop({
  items,
  theme,
  compact,
  preview,
  slug,
  ownerName,
}: {
  items: DigitalCardReachItem[];
  theme: DigitalCardTheme;
  compact?: boolean;
  preview?: boolean;
  slug?: string;
  ownerName?: string;
}) {
  const item = items[0];
  if (!item) return null;
  const desk = deskFromItem(item);
  return (
    <MeetingBooker
      desk={desk}
      theme={theme}
      compact={compact}
      preview={preview}
      slug={slug}
      ownerName={ownerName}
    />
  );
}

function MeetingBooker({
  desk,
  theme,
  compact,
  preview,
  slug,
  ownerName,
}: {
  desk: CeleCardMeetingDesk;
  theme: DigitalCardTheme;
  compact?: boolean;
  preview?: boolean;
  slug?: string;
  ownerName?: string;
}) {
  const guestZone = guessMeetingTimezone();
  const localSlots = useMemo(() => listOpenMeetingSlots(desk), [desk]);
  const [slots, setSlots] = useState(localSlots);
  const [dayKey, setDayKey] = useState(localSlots[0]?.dayKey ?? "");
  const [picked, setPicked] = useState<CeleCardMeetingSlot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<CeleCardMeetingSlot | null>(null);

  useEffect(() => {
    setSlots(localSlots);
    setDayKey(localSlots[0]?.dayKey ?? "");
  }, [localSlots]);

  useEffect(() => {
    if (preview || !slug) return;
    let cancelled = false;
    void fetch(`/api/digital-business-cards/meet?slug=${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled || !Array.isArray(json.slots)) return;
        const next = json.slots as CeleCardMeetingSlot[];
        setSlots(next);
        setDayKey((current) => (next.some((slot) => slot.dayKey === current) ? current : next[0]?.dayKey ?? ""));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [preview, slug]);

  const days = groupSlots(slots);
  const day = days.find((row) => row.key === dayKey) ?? days[0];
  const inputClass = "w-full rounded-xl border px-3 py-2.5 text-sm outline-none";
  const inputStyle = { borderColor: `${theme.border}`, background: "#fff", color: theme.text };

  async function submit() {
    if (preview) {
      setError("Preview only. Guests send this from the live card.");
      return;
    }
    if (!picked) {
      setError("Pick a time first.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Add your name so they know who is asking.");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError("Add an email or a number so they can confirm.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/digital-business-cards/meet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          start: picked.start,
          visitorName: name.trim(),
          visitorEmail: email.trim() || null,
          visitorPhone: phone.trim() || null,
          note: note.trim() || null,
          website: honeypot,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "That time just filled. Pick another.");
        return;
      }
      setDone(picked);
    } catch {
      setError("Could not send the request. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className={cn("grid gap-3", compact ? "p-3" : "p-3.5")}>
        <p className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: theme.accent }}>
          <Check className="h-4 w-4" />
          Request sent
        </p>
        <p className="text-sm leading-relaxed" style={{ color: theme.text }}>
          {formatMeetingWhen(done.start, desk.timezone)}
          {guestZone !== desk.timezone ? ` · your ${formatMeetingWhen(done.start, guestZone)}` : ""}. They will confirm this time.
        </p>
        <button
          type="button"
          onClick={() =>
            downloadMeetingIcs(
              "celeyou-meeting.ics",
              meetingIcs(
                {
                  start: done.start,
                  end: done.end,
                  timezone: desk.timezone,
                  title: desk.title,
                  place: desk.place,
                  note: desk.note,
                },
                ownerName || "CeleYou",
                name.trim() || "Guest"
              )
            )
          }
          className="inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white"
          style={{ background: theme.accent }}
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          Add to calendar
        </button>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3", compact ? "p-3" : "p-3.5")}>
      <div>
        <p className="text-sm font-semibold" style={{ color: theme.text }}>
          {desk.title}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: theme.muted }}>
          {meetingSubtitle(desk)}
          {desk.note ? ` · ${desk.note}` : ""}
        </p>
      </div>
      {days.length ? (
        <div className="flex snap-x snap-mandatory gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {days.map((row) => {
            const on = row.key === (day?.key ?? "");
            return (
              <button
                key={row.key}
                type="button"
                onClick={() => {
                  setDayKey(row.key);
                  setPicked(null);
                }}
                className="flex w-[3.6rem] shrink-0 snap-start flex-col items-center rounded-2xl border px-1.5 py-2"
                style={{
                  borderColor: on ? theme.accent : theme.border,
                  background: on ? theme.accent : "#fff",
                  color: on ? "#fff" : theme.text,
                }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">{row.weekday}</span>
                <span className="text-sm font-semibold">{row.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs" style={{ color: theme.muted }}>
          No open times in the next {desk.horizonDays} days.
        </p>
      )}
      {day?.slots.length ? (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {day.slots.map((slot) => {
            const on = picked?.start === slot.start;
            return (
              <button
                key={slot.start}
                type="button"
                onClick={() => setPicked(slot)}
                className="rounded-xl border px-2 py-2 text-sm font-semibold"
                style={{
                  borderColor: on ? theme.accent : theme.border,
                  background: on ? theme.accentSoft : "#fff",
                  color: theme.accent,
                }}
              >
                {slot.timeLabel}
              </button>
            );
          })}
        </div>
      ) : null}
      {picked && guestZone !== desk.timezone ? (
        <p className="text-[11px]" style={{ color: theme.muted }}>
          Your time {formatMeetingClockSafe(picked.start, guestZone)}
        </p>
      ) : null}
      {picked ? (
        <div className="grid gap-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            className={inputClass}
            style={inputStyle}
            autoComplete="name"
          />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className={inputClass}
            style={inputStyle}
            autoComplete="email"
          />
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Phone"
            className={inputClass}
            style={inputStyle}
            autoComplete="tel"
          />
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What is this about? Optional"
            className={inputClass}
            style={inputStyle}
          />
          <input
            tabIndex={-1}
            aria-hidden
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="inline-flex items-center justify-center rounded-full px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-60"
            style={{ background: theme.accent }}
          >
            {busy ? "Sending…" : preview ? "Preview request" : "Request this time"}
          </button>
        </div>
      ) : (
        <p className="text-xs" style={{ color: theme.muted }}>
          Pick a day, then a time. They get a message in their CeleYou inbox.
        </p>
      )}
      {error ? (
        <p className="text-xs font-medium" style={{ color: "#b45309" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function formatMeetingClockSafe(iso: string, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}
