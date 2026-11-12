"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, Check, ChevronLeft, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  compactMeetingDesk,
  defaultMeetingDesk,
  downloadMeetingIcs,
  formatMeetingWhen,
  groupMeetingDays,
  guessMeetingTimezone,
  listOpenMeetingSlots,
  meetingDurationCopy,
  meetingIcs,
  meetingSubtitle,
  type CeleCardMeetingDesk,
  type CeleCardMeetingSlot,
} from "@/lib/digital-business-card/meetings";
import type { DigitalCardReachItem } from "@/lib/digital-business-card/socials";
import type { DigitalCardTheme } from "@/lib/digital-business-card/themes";
import { CELECARD_REACH_INK, CELECARD_REACH_MUTED } from "@/lib/digital-business-card/type-voice";

function deskFromItem(item: DigitalCardReachItem): CeleCardMeetingDesk {
  try {
    return compactMeetingDesk(JSON.parse(item.copyValue || "{}")) ?? defaultMeetingDesk({ enabled: true, title: item.title });
  } catch {
    return defaultMeetingDesk({ enabled: true, title: item.title });
  }
}

export function meetingPreviewItems(desk: CeleCardMeetingDesk | null | undefined): DigitalCardReachItem[] {
  if (!desk?.enabled) return [];
  return [
    {
      id: "meeting-preview",
      brand: "meeting",
      title: desk.title,
      subtitle: meetingSubtitle(desk),
      href: "",
      copyValue: JSON.stringify(desk),
      surface: "stack",
    },
  ];
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
    setPicked(null);
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

  const days = groupMeetingDays(slots);
  const day = days.find((row) => row.key === dayKey) ?? days[0];
  const inputClass = "w-full rounded-xl border px-3 py-2.5 text-sm outline-none";
  const inputStyle = { borderColor: `${theme.border}`, background: "#fff", color: CELECARD_REACH_INK };
  const step = done ? "done" : picked ? "details" : "time";

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
        <p className="text-sm leading-relaxed" style={{ color: CELECARD_REACH_INK }}>
          {formatMeetingWhen(done.start, desk.timezone)}
          {guestZone !== desk.timezone ? ` · your ${formatMeetingWhen(done.start, guestZone)}` : ""}.{" "}
          {ownerName ? `${ownerName.split(" ")[0]} gets a message to confirm.` : "They get a message to confirm this time."}
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
          className="inline-flex items-center justify-center gap-2 rounded-full px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white"
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
        <p className="text-sm font-semibold" style={{ color: CELECARD_REACH_INK }}>
          {desk.title}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: CELECARD_REACH_MUTED }}>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {meetingDurationCopy(desk.durationMin)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {desk.place}
          </span>
        </p>
        {desk.note ? (
          <p className="mt-1 text-xs leading-relaxed" style={{ color: CELECARD_REACH_MUTED }}>
            {desk.note}
          </p>
        ) : null}
      </div>

      <p className="flex flex-wrap gap-x-3 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: CELECARD_REACH_MUTED }}>
        <span style={{ color: !picked ? theme.accent : CELECARD_REACH_MUTED }}>1 Day</span>
        <span style={{ color: !picked ? theme.accent : CELECARD_REACH_MUTED }}>2 Time</span>
        <span style={{ color: picked ? theme.accent : CELECARD_REACH_MUTED }}>3 Your details</span>
      </p>

      {step !== "details" ? (
        days.length ? (
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
                    setError(null);
                  }}
                  className="flex w-[4.1rem] shrink-0 snap-start flex-col items-center rounded-2xl border px-1.5 py-2"
                  style={{
                    borderColor: on ? theme.accent : theme.border,
                    background: on ? theme.accent : "#fff",
                    color: on ? "#fff" : CELECARD_REACH_INK,
                  }}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">{row.weekday}</span>
                  <span className="text-base font-semibold leading-tight">{row.label.split(" ")[0]}</span>
                  <span className="text-[9px] opacity-80">
                    {row.slots.length} {row.slots.length === 1 ? "time" : "times"}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs" style={{ color: CELECARD_REACH_MUTED }}>
            No open times in the next {desk.horizonDays} days.
          </p>
        )
      ) : null}

      {step !== "details" && day?.slots.length ? (
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {day.slots.map((slot) => {
            const on = picked?.start === slot.start;
            return (
              <button
                key={slot.start}
                type="button"
                onClick={() => {
                  setPicked(slot);
                  setError(null);
                }}
                className="rounded-xl border px-2 py-2.5 text-sm font-semibold"
                style={{
                  borderColor: on ? theme.accent : theme.border,
                  background: on ? theme.accent : "#fff",
                  color: on ? "#fff" : theme.accent,
                }}
              >
                {slot.timeLabel}
              </button>
            );
          })}
        </div>
      ) : null}

      {picked ? (
        <div
          className="rounded-2xl border px-3 py-2.5"
          style={{ borderColor: theme.border, background: theme.accentSoft || "rgba(11,138,131,0.08)" }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accent }}>
            You picked
          </p>
          <p className="mt-0.5 text-sm font-semibold" style={{ color: CELECARD_REACH_INK }}>
            {formatMeetingWhen(picked.start, desk.timezone)}
          </p>
          {guestZone !== desk.timezone ? (
            <p className="text-[11px]" style={{ color: CELECARD_REACH_MUTED }}>
              Your time {formatMeetingClockSafe(picked.start, guestZone)}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs" style={{ color: CELECARD_REACH_MUTED }}>
          Pick a day, then a time. They get a message in their CeleYou inbox.
        </p>
      )}

      {step === "details" && picked ? (
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => setPicked(null)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: theme.accent }}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Change time
          </button>
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
      ) : null}
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
