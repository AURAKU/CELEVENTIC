"use client";

import { useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarEventInput } from "@/lib/invitation/calendar-utils";
import { detectCalendarPlatform, setSmartCalendarReminder } from "@/lib/invitation/smart-calendar";

interface SetReminderButtonProps {
  event: CalendarEventInput;
  accentColor?: string;
  secondaryColor?: string;
  variant?: "pill" | "cta" | "dark" | "glass" | "minimal";
  className?: string;
  size?: "sm" | "default" | "lg";
  fullWidth?: boolean;
}

export function SetReminderButton({
  event,
  accentColor = "#0B8A83",
  secondaryColor = "#D4A63A",
  variant = "pill",
  className,
  size = "sm",
  fullWidth,
}: SetReminderButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

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
  };

  const isCustomColor = variant === "pill" || variant === "cta";

  return (
    <div className={cn(fullWidth && "w-full", className)}>
      <Button
        type="button"
        size={size}
        variant="outline"
        disabled={state === "loading"}
        onClick={() => void handleClick()}
        className={cn(
          variantClass[variant],
          fullWidth && "w-full",
          isCustomColor && "text-white border-transparent",
          variant === "pill" && "gap-2 px-5 py-2.5",
          variant === "cta" && "gap-2 px-6 py-3 text-sm uppercase tracking-wider"
        )}
        style={
          isCustomColor
            ? {
                background: `linear-gradient(135deg, ${accentColor}, ${secondaryColor}cc)`,
                borderColor: `${secondaryColor}66`,
              }
            : undefined
        }
      >
        {state === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "done" ? (
          <Check className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {state === "done" ? "Reminder set" : state === "loading" ? "Setting reminder…" : "Set a Reminder"}
      </Button>
      {state === "idle" && (
        <p className={cn("text-[10px] mt-1.5 text-center opacity-70", variant === "dark" || variant === "glass" ? "text-white/70" : "text-slate-500")}>
          {hint} · one tap
        </p>
      )}
      {message && state !== "idle" && (
        <p
          className={cn(
            "text-xs mt-1.5 text-center",
            state === "error" ? "text-red-500" : variant === "dark" || variant === "glass" ? "text-emerald-300" : "text-[#0B8A83]"
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
