"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, HelpCircle, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/i18n/locale-provider";
import type { ButtonStyle } from "@/lib/invitation-studio/studio-types";
import { isPreviewInvitationId } from "@/lib/invitation/guest-portal-actions";
import { styledInvitationButton } from "@/lib/invitation/invitation-button-styles";
import {
  clampAttendingCount,
  rsvpAcceptedThankYou,
  rsvpPartyCapacityLine,
  rsvpPartySlotGuidance,
} from "@/lib/invitation/rsvp-party-slots";
import {
  normalizeRsvpChoice,
  readPersistedRsvp,
  writePersistedRsvp,
  type PersistedRsvpChoice,
} from "@/lib/invitation/rsvp-persisted-state";

interface InvitationRsvpPanelProps {
  invitationId: string;
  guestId?: string;
  guestName?: string;
  accentColor?: string;
  textColor?: string;
  variant?: "light" | "dark";
  buttonStyle?: ButtonStyle | string;
  label?: string;
  /** Organiser-set heads this invitation admits. */
  partyAllowance?: number;
  initialRsvpStatus?: PersistedRsvpChoice | null;
  initialAttendingCount?: number | null;
}

export function InvitationRsvpPanel({
  invitationId,
  guestId,
  guestName: initialGuestName,
  accentColor = "#0D9488",
  variant = "light",
  buttonStyle,
  label,
  partyAllowance = 1,
  initialRsvpStatus = null,
  initialAttendingCount = null,
}: InvitationRsvpPanelProps) {
  const { t } = useLocale();
  const allowance = Math.max(1, Math.trunc(partyAllowance || 1));
  const seededStatus = normalizeRsvpChoice(initialRsvpStatus);
  const seededAttending = clampAttendingCount(
    initialAttendingCount ?? allowance,
    allowance
  );
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(seededStatus);
  const [confirmedAttending, setConfirmedAttending] = useState(seededAttending);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [guestName, setGuestName] = useState(initialGuestName?.trim() ?? "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [attendingCount, setAttendingCount] = useState(seededAttending);
  const nameLocked = Boolean(guestId && guestName.trim());
  const capacityCopy = rsvpPartyCapacityLine(allowance);
  const slotGuidance = useMemo(
    () => rsvpPartySlotGuidance(allowance, attendingCount),
    [allowance, attendingCount]
  );

  useEffect(() => {
    setAttendingCount((prev) => clampAttendingCount(prev, allowance));
  }, [allowance]);

  useEffect(() => {
    if (seededStatus) {
      setRsvpStatus(seededStatus);
      setConfirmedAttending(seededAttending);
      setAttendingCount(seededAttending);
      writePersistedRsvp(invitationId, guestId, {
        status: seededStatus,
        attendingCount: seededAttending,
      });
      return;
    }
    const cached = readPersistedRsvp(invitationId, guestId);
    if (!cached) return;
    setRsvpStatus(cached.status);
    const attending = clampAttendingCount(cached.attendingCount, allowance);
    setConfirmedAttending(attending);
    setAttendingCount(attending);
  }, [invitationId, guestId, seededStatus, seededAttending, allowance]);

  async function handleRsvp(response: "ACCEPTED" | "DECLINED" | "MAYBE") {
    if (isPreviewInvitationId(invitationId)) {
      setError("Preview mode, RSVP works on your published invitation link.");
      return;
    }
    setError("");
    setLoading(true);
    const cappedAttending = clampAttendingCount(attendingCount, allowance);
    const contact = {
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      ...(response === "ACCEPTED" ? { attendingCount: cappedAttending } : {}),
    };
    const payload = guestId
      ? { guestId, response, ...contact }
      : { invitationId, guestName: guestName.trim(), response, ...contact };

    if (!guestId && !guestName.trim()) {
      setError(t("rsvp.name_required"));
      setLoading(false);
      return;
    }

    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setConfirmedAttending(cappedAttending);
      setRsvpStatus(response);
      writePersistedRsvp(invitationId, guestId, {
        status: response,
        attendingCount: cappedAttending,
      });
    } else setError(data.error || t("rsvp.submit_failed"));
    setLoading(false);
  }

  const btnClass = buttonStyle
    ? styledInvitationButton(buttonStyle, variant, "px-4")
    : variant === "dark"
      ? "border-white/30 text-white hover:bg-white/10"
      : "";
  const fieldClass =
    variant === "dark" ? "bg-white/10 border-white/20 text-white placeholder:text-white/50" : "";

  if (rsvpStatus) {
    return (
      <div
        className="text-center p-4 rounded-lg font-medium inv-fade-in space-y-1"
        style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
      >
        <p>
          {t("rsvp.title")}: {rsvpStatus.replace(/_/g, " ")}, {t("rsvp.thank_you")}
        </p>
        {rsvpStatus === "ACCEPTED" && allowance > 1 ? (
          <p className="text-sm font-normal opacity-90">
            {rsvpAcceptedThankYou(confirmedAttending, allowance)}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {label ? (
        <p className="text-sm font-medium" style={{ color: accentColor }}>
          {label}
        </p>
      ) : null}
      {capacityCopy ? (
        <p className="text-xs font-semibold tracking-wide" style={{ color: accentColor }} data-testid="rsvp-capacity">
          {capacityCopy}
        </p>
      ) : null}
      <div className="space-y-2">
        <Input
          placeholder={t("rsvp.your_name")}
          value={guestName}
          onChange={(e) => {
            if (!nameLocked) setGuestName(e.target.value);
          }}
          readOnly={nameLocked}
          aria-readonly={nameLocked || undefined}
          title={nameLocked ? t("rsvp.name_locked") : undefined}
          className={`${fieldClass}${nameLocked ? " cursor-default opacity-90" : ""}`}
          disabled={loading}
        />
        <Input
          type="email"
          placeholder={t("rsvp.your_email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
          disabled={loading}
        />
        <Input
          type="tel"
          placeholder={t("rsvp.your_phone")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={fieldClass}
          disabled={loading}
        />
        {allowance > 1 ? (
          <div
            className={`rounded-lg border px-3 py-3 space-y-2 ${
              variant === "dark" ? "border-white/20 bg-white/5" : "border-slate-200 bg-slate-50/80"
            }`}
            data-testid="rsvp-party-slots"
          >
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: accentColor }}>
              Party seats
            </p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className={btnClass}
                disabled={loading || attendingCount <= 1}
                aria-label="Fewer attending"
                onClick={() => setAttendingCount((n) => clampAttendingCount(n - 1, allowance))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex-1 text-center">
                <p className="text-lg font-semibold tabular-nums" data-testid="rsvp-attending-count">
                  {slotGuidance.confirmed} / {allowance}
                </p>
                <p className="text-xs opacity-80">{slotGuidance.summary}</p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className={btnClass}
                disabled={loading || attendingCount >= allowance}
                aria-label="More attending"
                onClick={() => setAttendingCount((n) => clampAttendingCount(n + 1, allowance))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-center opacity-80" data-testid="rsvp-remaining-slots">
              {slotGuidance.detail}
            </p>
          </div>
        ) : null}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className={btnClass} onClick={() => handleRsvp("ACCEPTED")} disabled={loading}>
          <Check className="h-4 w-4 mr-1" /> {t("rsvp.accept")}
        </Button>
        <Button size="sm" variant="outline" className={btnClass} onClick={() => handleRsvp("DECLINED")} disabled={loading}>
          <X className="h-4 w-4 mr-1" /> {t("rsvp.decline")}
        </Button>
        <Button size="sm" variant="outline" className={btnClass} onClick={() => handleRsvp("MAYBE")} disabled={loading}>
          <HelpCircle className="h-4 w-4 mr-1" /> {t("rsvp.maybe")}
        </Button>
      </div>
    </div>
  );
}
