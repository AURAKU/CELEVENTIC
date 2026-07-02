"use client";

import type { CalendarEventInput } from "@/lib/invitation/calendar-utils";
import type { CalendarStyleId } from "@/lib/invitation/calendar-style-engine";
import { SetReminderButton } from "@/components/guest-portal/set-reminder-button";
import { cn } from "@/lib/utils";

export interface ThemedSaveDateCardProps {
  event: CalendarEventInput;
  styleId: CalendarStyleId;
  accentColor?: string;
  secondaryColor?: string;
  textColor?: string;
  backgroundColor?: string;
}

function useDateParts(startDateRaw: string) {
  const d = new Date(startDateRaw);
  if (Number.isNaN(d.getTime())) return null;
  return {
    month: d.toLocaleString("en", { month: "short" }).toUpperCase(),
    day: d.getDate(),
    weekday: d.toLocaleString("en", { weekday: "long" }),
    year: d.getFullYear(),
    time: d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit", hour12: true }),
  };
}

function ReminderFooter(props: {
  event: CalendarEventInput;
  accentColor?: string;
  secondaryColor?: string;
  dark?: boolean;
  glass?: boolean;
}) {
  return (
    <div className={cn("p-4 flex justify-center", props.dark && "bg-black/20", !props.dark && "bg-slate-50/80 border-t border-white/10")}>
      <SetReminderButton
        event={props.event}
        accentColor={props.accentColor}
        secondaryColor={props.secondaryColor}
        variant={props.dark ? "dark" : props.glass ? "glass" : "cta"}
        fullWidth
      />
    </div>
  );
}

export function ThemedSaveDateCard({
  event,
  styleId,
  accentColor = "#0B8A83",
  secondaryColor = "#D4A63A",
  textColor = "#0F172A",
}: ThemedSaveDateCardProps) {
  const parts = useDateParts(event.startDateRaw);
  if (!parts) return null;

  const shared = { event, accentColor, secondaryColor, textColor };

  switch (styleId) {
    case "boarding-pass":
      return (
        <div className="inv-3d-scene max-w-md mx-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-dashed border-slate-400/60 bg-[#f8fafc]">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-[#eceae6] rounded-r-full -ml-2" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-[#eceae6] rounded-l-full -mr-2" />
            <div className="flex">
              <div className="w-24 shrink-0 bg-[#1e3a5f] text-white p-4 flex flex-col justify-between">
                <p className="text-[9px] uppercase tracking-widest opacity-70">Boarding</p>
                <p className="text-3xl font-black leading-none">{parts.day}</p>
                <p className="text-[10px] font-bold">{parts.month}</p>
              </div>
              <div className="flex-1 p-5 border-l border-dashed border-slate-300">
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Save the date</p>
                <p className="font-display text-lg font-bold text-slate-900 mt-1 line-clamp-2">{event.title}</p>
                <p className="text-xs text-slate-600 mt-2">{parts.weekday}, {parts.year} · {parts.time}</p>
                {event.venue && <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-wide">{event.venue}</p>}
              </div>
            </div>
            <ReminderFooter {...shared} />
          </div>
        </div>
      );

    case "neon-grid":
      return (
        <div className="inv-3d-scene max-w-sm mx-auto">
          <div className="relative rounded-2xl overflow-hidden border border-fuchsia-500/50 shadow-[0_0_40px_rgba(217,70,239,0.35)] bg-[#0a0a0f]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(217,70,239,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(217,70,239,0.08)_1px,transparent_1px)] bg-[size:24px_24px] animate-pulse" />
            <div className="relative px-6 py-10 text-center">
              <p className="text-[10px] uppercase tracking-[0.5em] text-fuchsia-400 mb-3">Save the date</p>
              <p className="font-display text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-purple-300 to-cyan-400 inv-3d-date-num">
                {parts.day}
              </p>
              <p className="text-sm text-fuchsia-200/90 mt-2">{parts.month} {parts.year}</p>
              <p className="text-xs text-white/60 mt-1">{parts.weekday} · {parts.time}</p>
              <p className="text-sm text-white/80 mt-4 font-medium">{event.title}</p>
            </div>
            <ReminderFooter {...shared} dark />
          </div>
        </div>
      );

    case "velvet-night":
      return (
        <div className="inv-3d-scene max-w-sm mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-gradient-to-b from-indigo-950 via-slate-950 to-black">
            <div className="px-6 py-3 border-b border-white/10 flex justify-between items-center">
              <span className="text-[10px] uppercase tracking-[0.4em] text-slate-400">Midnight</span>
              <span className="text-[10px] text-amber-200/80">{parts.year}</span>
            </div>
            <div className="px-8 py-10 text-center">
              <p className="text-5xl font-display font-light text-white tracking-widest">{parts.month}</p>
              <p className="text-8xl font-display font-bold text-white/95 leading-none my-2 inv-3d-date-num">{parts.day}</p>
              <p className="text-sm text-slate-400">{parts.weekday} · {parts.time}</p>
              <div className="mt-6 h-px w-16 mx-auto bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
              <p className="text-sm text-amber-100/90 mt-4">{event.title}</p>
            </div>
            <ReminderFooter {...shared} dark />
          </div>
        </div>
      );

    case "kente-weave":
      return (
        <div className="inv-3d-scene max-w-sm mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-amber-600/80">
            <div className="h-3 bg-[repeating-linear-gradient(90deg,#92400e,#7f1d1d,#14532d,#92400e)]" />
            <div className="bg-gradient-to-br from-amber-50 to-emerald-50 px-6 py-8 text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-900/70 mb-2">Heritage union</p>
              <p className="text-6xl font-black text-amber-900 inv-3d-date-num">{parts.day}</p>
              <p className="text-lg font-semibold text-emerald-900">{parts.month} · {parts.year}</p>
              <p className="text-sm text-emerald-800/80 mt-2">{parts.weekday}</p>
              <p className="text-sm font-medium text-slate-800 mt-4">{event.title}</p>
            </div>
            <div className="h-2 bg-[repeating-linear-gradient(90deg,#14532d,#7f1d1d,#92400e,#14532d)]" />
            <ReminderFooter {...shared} />
          </div>
        </div>
      );

    case "emerald-palace":
      return (
        <div className="inv-3d-scene max-w-sm mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(6,78,59,0.45)] border border-amber-500/40 bg-gradient-to-b from-emerald-950 to-emerald-900">
            <div className="px-4 py-2 bg-gradient-to-r from-amber-600/30 via-amber-400/20 to-amber-600/30 text-center">
              <p className="text-[10px] uppercase tracking-[0.45em] text-amber-200">Royal save the date</p>
            </div>
            <div className="px-8 py-10 text-center relative">
              <div className="absolute inset-4 border border-amber-500/25 rounded-xl pointer-events-none" />
              <p className="text-xs text-emerald-200/80 uppercase tracking-widest">{parts.weekday}</p>
              <p className="font-display text-7xl font-bold text-amber-100 inv-3d-date-num mt-2">{parts.day}</p>
              <p className="text-lg text-emerald-100">{parts.month} {parts.year}</p>
              <p className="text-xs text-emerald-200/70 mt-2">{parts.time}</p>
              <p className="text-sm text-amber-50/90 mt-5 font-medium">{event.title}</p>
            </div>
            <ReminderFooter {...shared} dark />
          </div>
        </div>
      );

    case "glass-prism":
    case "crystal-shimmer":
      return (
        <div className="inv-3d-scene max-w-sm mx-auto relative">
          <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/50 bg-white/20 backdrop-blur-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-amber-100/30 pointer-events-none" />
            <div className="relative px-8 py-10 text-center">
              <p className="text-[10px] uppercase tracking-[0.4em] text-slate-600 mb-4">Crystal date</p>
              <div className="inline-flex flex-col items-center justify-center w-36 h-36 rounded-full border-2 border-white/60 bg-gradient-to-br from-white/80 to-sky-100/50 shadow-inner">
                <span className="text-[10px] text-slate-500 uppercase">{parts.month}</span>
                <span className="text-5xl font-light text-slate-800 inv-3d-date-num">{parts.day}</span>
              </div>
              <p className="text-sm text-slate-700 mt-4">{parts.weekday}, {parts.year}</p>
              <p className="text-xs text-slate-500">{parts.time}</p>
              <p className="text-sm font-medium text-slate-800 mt-4">{event.title}</p>
            </div>
            <ReminderFooter {...shared} glass />
          </div>
        </div>
      );

    case "petal-bloom":
    case "garden-arch":
      return (
        <div className="inv-3d-scene max-w-sm mx-auto">
          <div className="rounded-[2rem_2rem_1.5rem_1.5rem] overflow-hidden shadow-xl border border-emerald-200/80 bg-gradient-to-b from-rose-50 via-white to-emerald-50">
            <div className="h-16 bg-gradient-to-b from-emerald-800/90 to-emerald-700/80 rounded-b-[50%] mx-4 -mt-2 mb-4 flex items-end justify-center pb-2">
              <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-100">Garden date</p>
            </div>
            <div className="px-6 pb-6 text-center">
              <p className="text-6xl font-display text-emerald-900 inv-3d-date-num">{parts.day}</p>
              <p className="text-sm font-semibold text-rose-800/80 uppercase tracking-widest">{parts.month}</p>
              <p className="text-slate-600 text-sm mt-1">{parts.weekday} · {parts.time}</p>
              <p className="text-slate-800 font-medium mt-4 text-sm">{event.title}</p>
            </div>
            <ReminderFooter {...shared} />
          </div>
        </div>
      );

    case "hex-prism":
      return (
        <div className="inv-3d-scene max-w-sm mx-auto">
          <div className="relative p-8">
            <div
              className="absolute inset-4 bg-gradient-to-br from-rose-100 to-amber-100 shadow-xl"
              style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
            />
            <div className="relative text-center py-10 px-4">
              <p className="text-[10px] uppercase tracking-widest text-rose-900/60">Save the date</p>
              <p className="text-5xl font-bold text-rose-950 inv-3d-date-num mt-2">{parts.day}</p>
              <p className="text-sm text-rose-900/80">{parts.month} · {parts.year}</p>
              <p className="text-xs text-slate-600 mt-3">{event.title}</p>
            </div>
          </div>
          <div className="px-4 pb-2">
            <SetReminderButton event={event} accentColor={accentColor} secondaryColor={secondaryColor} variant="pill" fullWidth />
          </div>
        </div>
      );

    case "rings-orbit":
    case "luxury-foil":
      return (
        <div className="inv-3d-scene max-w-sm mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-500/50 bg-gradient-to-br from-neutral-950 via-amber-950/40 to-neutral-950">
            <div
              className="px-4 py-3 text-center text-xs uppercase tracking-[0.35em] font-semibold text-amber-100"
              style={{ background: `linear-gradient(135deg, ${accentColor}44, ${secondaryColor}33)` }}
            >
              ✦ Save the Date ✦
            </div>
            <div className="px-6 py-10 text-center relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-amber-500/20 animate-[inv-3d-float_6s_ease-in-out_infinite]" />
              <p className="text-xs text-amber-200/70 uppercase tracking-[0.3em]">{parts.month}</p>
              <p className="font-display text-7xl font-bold text-amber-100 inv-3d-date-num">{parts.day}</p>
              <p className="text-amber-200/90 mt-2">{parts.weekday}</p>
              <p className="text-xs text-amber-200/60">{parts.year} · {parts.time}</p>
              <p className="text-sm text-amber-50 mt-5 font-medium">{event.title}</p>
            </div>
            <ReminderFooter {...shared} dark />
          </div>
        </div>
      );

    case "memorial-soft":
      return (
        <div className="inv-3d-scene max-w-sm mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-300/50 bg-gradient-to-b from-slate-100 to-slate-200">
            <div className="px-6 py-10 text-center">
              <p className="text-[10px] uppercase tracking-[0.4em] text-slate-500 mb-4">In remembrance</p>
              <p className="text-5xl font-serif text-slate-800 inv-3d-date-num">{parts.day}</p>
              <p className="text-sm text-slate-600 mt-2">{parts.month} {parts.year}</p>
              <p className="text-xs text-slate-500 mt-1">{parts.weekday}</p>
              <p className="text-sm text-slate-700 mt-5 leading-relaxed">{event.title}</p>
            </div>
            <ReminderFooter {...shared} />
          </div>
        </div>
      );

    case "summit-ticket":
      return (
        <div className="inv-3d-scene max-w-md mx-auto">
          <div className="rounded-xl overflow-hidden shadow-xl border border-slate-700 bg-slate-900 text-white">
            <div className="flex items-stretch">
              <div className="bg-[#0B8A83] px-4 py-6 flex flex-col justify-center items-center min-w-[88px]">
                <p className="text-[9px] uppercase opacity-80">Event</p>
                <p className="text-3xl font-bold">{parts.day}</p>
                <p className="text-[10px] font-semibold">{parts.month}</p>
              </div>
              <div className="flex-1 p-5 border-l border-dashed border-slate-600">
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Summit · Save the date</p>
                <p className="font-semibold mt-1 line-clamp-2">{event.title}</p>
                <p className="text-xs text-slate-400 mt-2">{parts.weekday} · {parts.time}</p>
              </div>
            </div>
            <ReminderFooter {...shared} dark />
          </div>
        </div>
      );

    case "islamic-ornate":
      return (
        <div className="inv-3d-scene max-w-sm mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-2xl border-2 border-emerald-700/50 bg-gradient-to-b from-emerald-50 to-amber-50">
            <div className="h-2 bg-[repeating-linear-gradient(90deg,#059669,#D4AF37,#059669)]" />
            <div className="px-8 py-10 text-center">
              <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-800/70">Bismillah · Save the date</p>
              <p className="font-display text-6xl text-emerald-900 mt-4 inv-3d-date-num">{parts.day}</p>
              <p className="text-emerald-800 font-medium">{parts.month} {parts.year}</p>
              <p className="text-sm text-emerald-900/80 mt-4">{event.title}</p>
            </div>
            <ReminderFooter {...shared} />
          </div>
        </div>
      );

    case "vintage-lace":
      return (
        <div className="inv-3d-scene max-w-sm mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-xl border-4 border-double border-amber-100 bg-[#faf8f4]">
            <div className="px-6 py-8 text-center bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0iI2QxZDUiLz48L3N2Zz4=')]">
              <p className="text-xs italic text-amber-900/70">Save the date</p>
              <p className="font-serif text-6xl text-amber-950 mt-2 inv-3d-date-num">{parts.day}</p>
              <p className="text-sm text-amber-900/80">{parts.month} · {parts.year}</p>
              <p className="text-xs text-slate-600 mt-4">{event.title}</p>
            </div>
            <ReminderFooter {...shared} />
          </div>
        </div>
      );

    default:
      return (
        <div className="inv-3d-scene max-w-sm mx-auto">
          <div className="inv-3d-calendar-card rounded-2xl overflow-hidden shadow-2xl border border-white/30">
            <div
              className="px-4 py-3 text-center text-white font-semibold tracking-[0.25em] text-xs uppercase"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${secondaryColor}99)` }}
            >
              Save the Date
            </div>
            <div className="bg-white px-6 py-8 text-center relative">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400 mb-1">{parts.month}</p>
              <p className="font-display text-6xl font-bold text-slate-900 leading-none inv-3d-date-num">{parts.day}</p>
              <p className="text-lg font-medium text-slate-700 mt-2">{parts.weekday}</p>
              <p className="text-sm text-slate-500 mt-1">{parts.year} · {parts.time}</p>
              {event.venue && <p className="text-xs text-slate-500 mt-4 px-2 leading-relaxed">{event.venue}</p>}
              <p className="text-sm font-medium text-slate-800 mt-4 line-clamp-2">{event.title}</p>
            </div>
            <ReminderFooter {...shared} />
          </div>
        </div>
      );
  }
}
