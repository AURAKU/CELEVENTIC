"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  constrainCeleYouUsernameInput,
  parseCeleYouUsername,
  usernameAvailabilityMessage,
  type CeleYouUsernameReason,
} from "@/lib/digital-business-card/username";
import { cn } from "@/lib/utils";

type Availability = {
  username: string;
  available: boolean;
  reason: CeleYouUsernameReason;
  suggestions: string[];
  message?: string;
};

export function CeleYouUsernameField({
  value,
  onChange,
  displayName,
  company,
  profession,
  currentUsername,
  publicOrigin,
  compact = false,
}: {
  value: string;
  onChange: (username: string) => void;
  displayName?: string;
  company?: string;
  profession?: string;
  currentUsername?: string | null;
  publicOrigin?: string;
  compact?: boolean;
}) {
  const [status, setStatus] = useState<Availability | null>(null);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const seq = useRef(0);
  const parsed = parseCeleYouUsername(value);
  const origin = (publicOrigin || "").replace(/\/$/, "");
  const preview = parsed.ok ? `${origin || "celeventic.com"}/u/${parsed.username}` : "";

  useEffect(() => {
    if (!parsed.ok) {
      setStatus(null);
      setChecking(false);
      return;
    }
    if (currentUsername && parsed.username === currentUsername) {
      setStatus({
        username: parsed.username,
        available: true,
        reason: "AVAILABLE",
        suggestions: [],
        message: "This is your current username.",
      });
      return;
    }
    const request = ++seq.current;
    setChecking(true);
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ username: parsed.username });
      if (displayName) params.set("displayName", displayName);
      if (company) params.set("company", company);
      if (profession) params.set("profession", profession);
      void fetch(`/api/digital-business-cards/usernames/availability?${params.toString()}`)
        .then(async (res) => {
          if (!res.ok) return null;
          return (await res.json()) as Availability;
        })
        .then((data) => {
          if (request !== seq.current) return;
          setStatus(data);
        })
        .finally(() => {
          if (request === seq.current) setChecking(false);
        });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [value, displayName, company, profession, currentUsername, parsed.ok, parsed.ok ? parsed.username : ""]);

  const waiting = Boolean(parsed.ok && value.length >= 3 && (checking || !status));
  const tone =
    !value || value.length < 3
      ? "idle"
      : waiting
        ? "checking"
        : parsed.ok && status?.available
          ? "ok"
          : "bad";

  return (
    <div className={cn("space-y-2", compact && "space-y-1.5")}>
      <Label htmlFor="celeyou-username">Username</Label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">@</span>
        <Input
          id="celeyou-username"
          value={value}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={tone === "bad"}
          aria-describedby="celeyou-username-help"
          className="pl-8"
          placeholder="owuraku.afari"
          onChange={(event) => onChange(constrainCeleYouUsernameInput(event.target.value))}
        />
        {checking ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" /> : null}
      </div>
      <p
        id="celeyou-username-help"
        className={cn(
          "text-xs",
          tone === "ok" ? "text-emerald-700" : tone === "bad" ? "text-red-600" : "text-slate-500"
        )}
      >
        {!value
          ? "This is your public handle. Your display name can stay exactly as it is."
          : !parsed.ok
            ? parsed.message
            : waiting
              ? "Checking availability…"
              : status?.message || usernameAvailabilityMessage(status?.reason ?? "INVALID")}
      </p>
      {preview ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 truncate text-xs text-slate-600">{preview}</p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[#0B8A83]"
            onClick={() => {
              const handle = parsed.ok ? parsed.username : value;
              const full = origin ? `${origin}/u/${handle}` : `/u/${handle}`;
              void navigator.clipboard.writeText(full).catch(() => undefined);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }}
          >
            {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
            Copy link
          </Button>
        </div>
      ) : null}
      {status?.suggestions?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {status.suggestions.map((item) => (
            <button
              key={item}
              type="button"
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-[#0B8A83] hover:text-[#0B8A83]"
              onClick={() => onChange(item)}
            >
              @{item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
