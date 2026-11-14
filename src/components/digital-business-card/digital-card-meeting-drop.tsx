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
  meetingIcs,
  meetingSubtitle,
  type CeleCardMeetingDesk,
  type CeleCardMeetingSlot,
} from "@/lib/digital-business-card/meetings";
import type { DigitalCardReachItem } from "@/lib/digital-business-card/socials";
import type { DigitalCardTheme } from "@/lib/digital-business-card/themes";
import { CELECARD_REACH_INK, celecardInkLuminance, celecardPaperTone } from "@/lib/digital-business-card/type-voice";
import { useLocale } from "@/components/i18n/locale-provider";
import { htmlLang } from "@/lib/i18n/constants";
import { trackCeleYouGuestEvent } from "@/lib/celeyou-share/events";

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
  const { t, locale } = useLocale();
  const lang = htmlLang(locale);
  const guestZone = guessMeetingTimezone();
  const localSlots = useMemo(() => listOpenMeetingSlots(desk, [], new Date(), lang), [desk, lang]);
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
  const [shake, setShake] = useState<"name" | "reach" | "form" | null>(null);
  const [done, setDone] = useState<CeleCardMeetingSlot | null>(null);
  const paper = celecardPaperTone(theme);
  const fill = paper.accent;
  const fillInk = celecardInkLuminance(fill) < 158 ? "#fffef8" : "#16120e";

  useEffect(() => {
    if (preview || !slug || !picked) return;
    trackCeleYouGuestEvent(slug, "meeting_open", { brand: "meeting", outcome: "attempted" });
  }, [picked, preview, slug]);

  function react(kind: "name" | "reach" | "form") {
    setShake(kind);
    window.setTimeout(() => setShake((current) => (current === kind ? null : current)), 420);
  }

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
      react("form");
      setError("preview");
      return;
    }
    if (!picked) {
      react("form");
      return;
    }
    if (name.trim().length < 2) {
      react("name");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      react("reach");
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
        react("form");
        setError("busy");
        return;
      }
      setDone(picked);
    } catch {
      react("form");
      setError("network");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className={cn("celecard-meet celecard-meet-pop grid gap-3", compact ? "p-3" : "p-3.5")}>
        <p className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: fill }}>
          <span className="grid h-8 w-8 place-items-center rounded-full" style={{ background: fill, color: fillInk }}>
            <Check className="h-4 w-4" />
          </span>
          {t("celeyou.meet_request_sent")}
        </p>
        <p className="text-sm font-medium leading-relaxed" style={{ color: CELECARD_REACH_INK }}>
          {formatMeetingWhen(done.start, desk.timezone, lang)}
          {guestZone !== desk.timezone ? ` · ${t("celeyou.meet_your_when", { when: formatMeetingWhen(done.start, guestZone, lang) })}` : ""}.{" "}
          {ownerName
            ? t("celeyou.meet_confirm_named", { name: ownerName.split(" ")[0] || ownerName })
            : t("celeyou.meet_confirm")}
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
          className="celecard-meet-chip inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold"
          style={{ background: fill, color: fillInk }}
        >
          <CalendarPlus className="h-4 w-4" />
          {t("celeyou.meet_add_calendar")}
        </button>
      </div>
    );
  }

  return (
    <div className={cn("celecard-meet grid gap-3", compact ? "p-3" : "p-3.5", shake === "form" && "celecard-meet-shake")}>
      <div className="sr-only" aria-live="polite">
        {error === "busy" ? t("celeyou.meet_busy") : error === "network" ? t("celeyou.send_failed") : shake === "name" ? t("celeyou.meet_name_needed") : shake === "reach" ? t("celeyou.meet_reach_needed") : ""}
      </div>
      <div>
        <p className="text-[15px] font-semibold" style={{ color: CELECARD_REACH_INK }}>
          {desk.title}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-medium" style={{ color: CELECARD_REACH_INK }}>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" style={{ color: fill }} />
            {desk.durationMin === 60 ? t("celeyou.meet_hour") : t("celeyou.meet_minutes", { count: desk.durationMin })}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" style={{ color: fill }} />
            {desk.place}
          </span>
        </p>
        {desk.note ? (
          <p className="mt-1 text-[13px] font-medium leading-relaxed" style={{ color: CELECARD_REACH_INK }}>
            {desk.note}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5" role="list">
        {[
          { id: t("celeyou.meet_step_day"), on: step === "time", done: Boolean(dayKey) },
          { id: t("celeyou.meet_step_time"), on: step === "time", done: Boolean(picked) },
          { id: t("celeyou.meet_step_details"), on: step === "details", done: false },
        ].map((row) => (
          <span
            key={row.id}
            role="listitem"
            className="celecard-meet-step"
            data-on={row.on ? "true" : "false"}
            style={{
              background: row.on || row.done ? fill : "#fffef8",
              color: row.on || row.done ? fillInk : CELECARD_REACH_INK,
              border: `1px solid ${row.on || row.done ? fill : "rgba(28,25,23,0.16)"}`,
            }}
          >
            {row.done ? <Check className="h-3 w-3" /> : null}
            {row.id}
          </span>
        ))}
      </div>

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
                  className="celecard-meet-chip flex w-[4.35rem] shrink-0 snap-start flex-col items-center rounded-2xl border px-1.5 py-2"
                  data-on={on ? "true" : "false"}
                  aria-pressed={on}
                  style={{
                    borderColor: on ? fill : "rgba(28,25,23,0.16)",
                    background: on ? fill : "#fffef8",
                    color: on ? fillInk : CELECARD_REACH_INK,
                  }}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">{row.weekday}</span>
                  <span className="text-lg font-semibold leading-tight">{row.label.split(" ")[0]}</span>
                  <span className="text-[10px] font-semibold">
                    {row.slots.length === 1 ? t("celeyou.meet_one_time") : t("celeyou.meet_n_times", { count: row.slots.length })}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm font-medium" style={{ color: CELECARD_REACH_INK }}>
            {t("celeyou.meet_no_times", { days: desk.horizonDays })}
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
                className="celecard-meet-chip inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-[15px] font-semibold"
                data-on={on ? "true" : "false"}
                aria-pressed={on}
                style={{
                  borderColor: on ? fill : "rgba(28,25,23,0.16)",
                  background: on ? fill : "#fffef8",
                  color: on ? fillInk : CELECARD_REACH_INK,
                }}
              >
                {on ? <Check className="h-4 w-4" /> : null}
                {slot.timeLabel}
              </button>
            );
          })}
        </div>
      ) : null}

      {picked ? (
        <div
          className="celecard-meet-pop rounded-2xl border px-3 py-2.5"
          style={{ borderColor: fill, background: "#fffef8" }}
        >
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: fill }}>
            <Check className="h-3.5 w-3.5" />
            {t("celeyou.meet_you_picked")}
          </p>
          <p className="mt-0.5 text-sm font-semibold" style={{ color: CELECARD_REACH_INK }}>
            {formatMeetingWhen(picked.start, desk.timezone, lang)}
          </p>
          {guestZone !== desk.timezone ? (
            <p className="text-[13px] font-medium" style={{ color: CELECARD_REACH_INK }}>
              {t("celeyou.meet_your_time", { when: formatMeetingClockSafe(picked.start, guestZone, lang) })}
            </p>
          ) : null}
        </div>
      ) : null}

      {step === "details" && picked ? (
        <div className="relative grid gap-2">
          <button
            type="button"
            onClick={() => setPicked(null)}
            className="inline-flex items-center gap-1 text-[13px] font-semibold"
            style={{ color: fill }}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {t("celeyou.meet_change_time")}
          </button>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("celeyou.your_name")}
            className={cn(inputClass, shake === "name" && "celecard-meet-shake")}
            style={{
              ...inputStyle,
              borderColor: shake === "name" ? "#b45309" : "rgba(28,25,23,0.16)",
            }}
            autoComplete="name"
            aria-invalid={shake === "name"}
          />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("celeyou.email")}
            className={cn(inputClass, shake === "reach" && "celecard-meet-shake")}
            style={{
              ...inputStyle,
              borderColor: shake === "reach" ? "#b45309" : "rgba(28,25,23,0.16)",
            }}
            autoComplete="email"
            aria-invalid={shake === "reach"}
          />
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder={t("celeyou.phone_short")}
            className={cn(inputClass, shake === "reach" && "celecard-meet-shake")}
            style={{
              ...inputStyle,
              borderColor: shake === "reach" ? "#b45309" : "rgba(28,25,23,0.16)",
            }}
            autoComplete="tel"
            aria-invalid={shake === "reach"}
          />
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t("celeyou.meet_about_optional")}
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
            className="celecard-meet-chip inline-flex min-h-11 items-center justify-center rounded-full px-3 text-sm font-semibold disabled:opacity-60"
            style={{ background: fill, color: fillInk }}
          >
            {busy ? t("celeyou.sending") : preview ? t("celeyou.meet_preview") : t("celeyou.meet_request_time")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function formatMeetingClockSafe(iso: string, timeZone: string, locale = "en-GB") {
  try {
    return new Intl.DateTimeFormat(locale, {
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
