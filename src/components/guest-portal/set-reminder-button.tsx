"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildIcsBlob,
  hasValidCalendarWindow,
  type CalendarEventInput,
} from "@/lib/invitation/calendar-utils";
import {
  calendarFileName,
  detectCalendarPlatform,
  resolveCalendarPrimaryAction,
  setSmartCalendarReminder,
} from "@/lib/invitation/smart-calendar";

interface SetReminderButtonProps {
  event: CalendarEventInput;
  accentColor?: string;
  secondaryColor?: string;
  variant?: "pill" | "cta" | "dark" | "glass" | "minimal" | "plain";
  className?: string;
  size?: "sm" | "default" | "lg";
  fullWidth?: boolean;
  /** Idle helper under the button. Fashion hub omits it. */
  showHint?: boolean;
}

export function SetReminderButton({
  event,
  accentColor = "#0B8A83",
  secondaryColor = "#D4A63A",
  variant = "pill",
  className,
  size = "sm",
  fullWidth,
  showHint = true,
}: SetReminderButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const action = ready ? resolveCalendarPrimaryAction(event) : null;
  const filename = calendarFileName(event.title);
  const datesReady = hasValidCalendarWindow(event);

  const icsUrl = useMemo(() => {
    if (!ready || action?.kind !== "ics" || !datesReady) return "";
    return URL.createObjectURL(buildIcsBlob(event));
  }, [
    ready,
    action?.kind,
    datesReady,
    event.title,
    event.startDateRaw,
    event.endDateRaw,
    event.venue,
    event.description,
    event.timeZone,
  ]);

  useEffect(() => {
    return () => {
      if (icsUrl) URL.revokeObjectURL(icsUrl);
    };
  }, [icsUrl]);

  function markDone() {
    setState("done");
    setMessage("");
    window.setTimeout(() => setState("idle"), 3500);
  }

  async function handleClick() {
    if (state === "loading") return;
    setState("loading");
    setMessage("");
    const result = await setSmartCalendarReminder(event);
    setState(result.success ? "done" : "error");
    setMessage(result.message);
    if (result.success) {
      setTimeout(() => setState("idle"), 3500);
    }
  }

  const platform = typeof navigator !== "undefined" ? detectCalendarPlatform() : "google";
  const hint =
    platform === "apple"
      ? "Adds to Apple Calendar"
      : platform === "google"
        ? "Adds to Google Calendar"
        : "Adds to your calendar";

  const variantClass: Record<typeof variant, string> = {
    pill:
      "rounded-full border font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all touch-manipulation",
    cta: "rounded-xl font-bold shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all touch-manipulation",
    dark: "rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-md hover:bg-white/20",
    glass:
      "rounded-xl border border-white/40 bg-white/20 backdrop-blur-xl text-white shadow-lg hover:bg-white/30",
    minimal: "rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800",
    plain: "touch-manipulation",
  };

  const isCustomColor = variant === "pill" || variant === "cta";
  const controlClass = cn(
    variantClass[variant],
    fullWidth && "w-full",
    isCustomColor && "text-white border-transparent",
    variant === "pill" && "gap-2 px-5 py-2.5",
    variant === "cta" && "gap-2 px-6 py-3 text-sm uppercase tracking-wider"
  );
  const controlStyle = isCustomColor
    ? {
        background: `linear-gradient(135deg, ${accentColor}, ${secondaryColor}cc)`,
        borderColor: `${secondaryColor}66`,
      }
    : undefined;

  const label =
    state === "done" ? "Reminder set" : state === "loading" ? "Setting reminder…" : "Set a Reminder";
  const icon =
    state === "loading" ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : state === "done" ? (
      <Check className="h-4 w-4" />
    ) : (
      <Bell className="h-4 w-4" />
    );

  const webHref = action?.kind === "web" ? action.href : "";
  const useWebLink = Boolean(ready && webHref && state !== "loading");
  const useIcsLink = Boolean(ready && icsUrl && state !== "loading");

  return (
    <div className={cn(fullWidth && "w-full", className)}>
      {useWebLink ? (
        <Button asChild size={size} variant="outline" className={controlClass} style={controlStyle}>
          <a href={webHref} target="_blank" rel="noopener noreferrer" onClick={markDone}>
            {icon}
            {label}
          </a>
        </Button>
      ) : useIcsLink ? (
        <Button asChild size={size} variant="outline" className={controlClass} style={controlStyle}>
          <a href={icsUrl} download={filename} onClick={markDone}>
            {icon}
            {label}
          </a>
        </Button>
      ) : (
        <Button
          type="button"
          size={size}
          variant="outline"
          disabled={state === "loading" || (ready && !datesReady)}
          onClick={() => void handleClick()}
          className={controlClass}
          style={controlStyle}
        >
          {icon}
          {label}
        </Button>
      )}
      {showHint && state === "idle" && (
        <p
          className={cn(
            "text-[10px] mt-1.5 text-center opacity-70",
            variant === "dark" || variant === "glass" ? "text-white/70" : "text-slate-500"
          )}
        >
          {hint} · one tap
        </p>
      )}
      {message && state !== "idle" && (
        <p
          className={cn(
            "text-xs mt-1.5 text-center",
            state === "error"
              ? "text-red-500"
              : variant === "dark" || variant === "glass"
                ? "text-emerald-300"
                : "text-[#0B8A83]"
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
