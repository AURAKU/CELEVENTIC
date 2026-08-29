"use client";

import { useEffect, useMemo, useState, type ComponentProps } from "react";
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
  variant?: "light" | "dark" | "fashion";
  buttonStyle?: ButtonStyle | string;
  label?: string;
  /** Organiser-set heads this invitation admits. */
  partyAllowance?: number;
  initialRsvpStatus?: PersistedRsvpChoice | null;
  initialAttendingCount?: number | null;
  /** When false, the optional email field is omitted (e.g. funeral attendance). Default true. */
  showEmail?: boolean;
  /** When false, the optional phone field is omitted. Default true. */
  showPhone?: boolean;
  /** Celebration vs memorial reply chrome (button language & styling). */
  tone?: "celebration" | "memorial";
  /** Optional guest-facing labels. Values posted to the API stay ACCEPTED/DECLINED/MAYBE. */
  choiceLabels?: {
    accepted?: string;
    declined?: string;
    maybe?: string;
  };
  onSubmitted?: (status: PersistedRsvpChoice) => void;
  /** Optional note posted through the existing RSVP `message` field. */
  guestMessage?: string;
  /** Replaces the default thank-you line after a successful reply. */
  successCopy?: string;
}

function FashionRsvpField({
  className,
  ...props
}: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={["ff-rsvp-field", className].filter(Boolean).join(" ")}
    />
  );
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
  showEmail = true,
  showPhone = true,
  tone = "celebration",
  choiceLabels,
  onSubmitted,
  guestMessage,
  successCopy,
}: InvitationRsvpPanelProps) {
  const { t } = useLocale();
  const memorial = tone === "memorial";
  const fashion = variant === "fashion";
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
      ...(showEmail ? { email: email.trim() || undefined } : {}),
      ...(showPhone ? { phone: phone.trim() || undefined } : {}),
      ...(response === "ACCEPTED" ? { attendingCount: cappedAttending } : {}),
    };
    const note = guestMessage?.trim();
    const payload = guestId
      ? { guestId, response, ...contact, ...(note ? { message: note } : {}) }
      : { invitationId, guestName: guestName.trim(), response, ...contact, ...(note ? { message: note } : {}) };

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
      onSubmitted?.(response);
    } else setError(data.error || t("rsvp.submit_failed"));
    setLoading(false);
  }

  const btnClass = buttonStyle
    ? styledInvitationButton(buttonStyle, variant === "dark" ? "dark" : "light", "px-4")
    : variant === "dark"
      ? "border-white/30 text-white hover:bg-white/10"
      : "";
  const fieldClass = memorial
    ? "inv-rsvp-field"
    : variant === "dark"
      ? "bg-white/10 border-white/20 text-white placeholder:text-white/50"
      : "";

  if (rsvpStatus) {
    return (
      <div
        className={
          fashion
            ? "ff-rsvp-confirmed"
            : memorial
              ? "inv-rsvp-confirmed text-center"
              : "text-center p-4 rounded-lg font-medium inv-fade-in space-y-1"
        }
        style={
          memorial || fashion
            ? undefined
            : { backgroundColor: `${accentColor}18`, color: accentColor }
        }
      >
        <p
          className={
            fashion
              ? "ff-rsvp-confirmed-title"
              : memorial
                ? "inv-rsvp-confirmed-title"
                : undefined
          }
        >
          {successCopy?.trim()
            ? successCopy.trim()
            : `${t("rsvp.title")}: ${rsvpStatus.replace(/_/g, " ")}, ${t("rsvp.thank_you")}`}
        </p>
        {rsvpStatus === "ACCEPTED" && allowance > 1 ? (
          <p
            className={
              fashion
                ? "ff-rsvp-confirmed-detail"
                : memorial
                  ? "inv-rsvp-confirmed-detail"
                  : "text-sm font-normal opacity-90"
            }
          >
            {rsvpAcceptedThankYou(confirmedAttending, allowance)}
          </p>
        ) : null}
      </div>
    );
  }

  const choices: Array<{
    id: "ACCEPTED" | "DECLINED" | "MAYBE";
    label: string;
    whisper: string;
    icon: typeof Check;
    tone: "accept" | "decline" | "maybe";
  }> = [
    {
      id: "ACCEPTED",
      label: choiceLabels?.accepted ?? t("rsvp.accept"),
      whisper: memorial ? "With the family" : "",
      icon: Check,
      tone: "accept",
    },
    {
      id: "DECLINED",
      label: choiceLabels?.declined ?? t("rsvp.decline"),
      whisper: memorial ? "With deep regret" : "",
      icon: X,
      tone: "decline",
    },
    {
      id: "MAYBE",
      label: choiceLabels?.maybe ?? t("rsvp.maybe"),
      whisper: memorial ? "Still hoping" : "",
      icon: HelpCircle,
      tone: "maybe",
    },
  ];

  const nameField = fashion ? (
    <FashionRsvpField
      placeholder={t("rsvp.your_name")}
      value={guestName}
      onChange={(e) => {
        if (!nameLocked) setGuestName(e.target.value);
      }}
      readOnly={nameLocked}
      aria-readonly={nameLocked || undefined}
      title={nameLocked ? t("rsvp.name_locked") : undefined}
      className={nameLocked ? "ff-rsvp-field--locked" : undefined}
      disabled={loading}
    />
  ) : (
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
  );

  const emailField = !showEmail ? null : fashion ? (
    <FashionRsvpField
      type="email"
      placeholder={t("rsvp.your_email")}
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      disabled={loading}
    />
  ) : (
    <Input
      type="email"
      placeholder={t("rsvp.your_email")}
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      className={fieldClass}
      disabled={loading}
    />
  );

  const phoneField = !showPhone ? null : fashion ? (
    <FashionRsvpField
      type="tel"
      placeholder={t("rsvp.your_phone")}
      value={phone}
      onChange={(e) => setPhone(e.target.value)}
      disabled={loading}
    />
  ) : (
    <Input
      type="tel"
      placeholder={t("rsvp.your_phone")}
      value={phone}
      onChange={(e) => setPhone(e.target.value)}
      className={fieldClass}
      disabled={loading}
    />
  );

  return (
    <div
      className={
        fashion ? "ff-rsvp-panel" : memorial ? "inv-rsvp-panel space-y-4" : "space-y-3"
      }
    >
      {label ? (
        <p
          className={fashion ? "ff-rsvp-label" : "text-sm font-medium"}
          style={fashion ? undefined : { color: accentColor }}
        >
          {label}
        </p>
      ) : null}
      {capacityCopy && !fashion ? (
        <p
          className={
            fashion
              ? "ff-rsvp-capacity"
              : memorial
                ? "inv-rsvp-capacity"
                : "text-xs font-semibold tracking-wide"
          }
          style={memorial || fashion ? undefined : { color: accentColor }}
          data-testid="rsvp-capacity"
        >
          {capacityCopy}
        </p>
      ) : null}
      <div className={fashion ? "ff-rsvp-fields" : "space-y-2"}>
        {nameField}
        {emailField}
        {phoneField}
        {allowance > 1 ? (
          <div
            className={
              fashion
                ? "ff-rsvp-party"
                : memorial
                  ? "inv-rsvp-party"
                  : `rounded-lg border px-3 py-3 space-y-2 ${
                      variant === "dark"
                        ? "border-white/20 bg-white/5"
                        : "border-slate-200 bg-slate-50/80"
                    }`
            }
            data-testid="rsvp-party-slots"
          >
            <p
              className={
                fashion
                  ? "ff-rsvp-party-label"
                  : memorial
                    ? "inv-rsvp-party-label"
                    : "text-xs font-semibold uppercase tracking-wide"
              }
              style={memorial || fashion ? undefined : { color: accentColor }}
            >
              Party seats
            </p>
            <div className={fashion ? "ff-rsvp-party-row" : "flex items-center gap-3"}>
              {fashion ? (
                <button
                  type="button"
                  className="ff-rsvp-party-stepper"
                  disabled={loading || attendingCount <= 1}
                  aria-label="Fewer attending"
                  onClick={() => setAttendingCount((n) => clampAttendingCount(n - 1, allowance))}
                >
                  <span aria-hidden>−</span>
                </button>
              ) : (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className={memorial ? "inv-rsvp-party-stepper" : btnClass}
                  disabled={loading || attendingCount <= 1}
                  aria-label="Fewer attending"
                  onClick={() => setAttendingCount((n) => clampAttendingCount(n - 1, allowance))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              )}
              <div className={fashion ? "ff-rsvp-party-copy" : "flex-1 text-center"}>
                <p
                  className={
                    fashion
                      ? "ff-rsvp-party-count"
                      : memorial
                        ? "inv-rsvp-party-count"
                        : "text-lg font-semibold tabular-nums"
                  }
                  data-testid="rsvp-attending-count"
                >
                  {slotGuidance.confirmed} / {allowance}
                </p>
                <p
                  className={
                    fashion
                      ? "ff-rsvp-party-summary"
                      : memorial
                        ? "inv-rsvp-party-summary"
                        : "text-xs opacity-80"
                  }
                >
                  {slotGuidance.summary}
                </p>
              </div>
              {fashion ? (
                <button
                  type="button"
                  className="ff-rsvp-party-stepper"
                  disabled={loading || attendingCount >= allowance}
                  aria-label="More attending"
                  onClick={() => setAttendingCount((n) => clampAttendingCount(n + 1, allowance))}
                >
                  <span aria-hidden>+</span>
                </button>
              ) : (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className={memorial ? "inv-rsvp-party-stepper" : btnClass}
                  disabled={loading || attendingCount >= allowance}
                  aria-label="More attending"
                  onClick={() => setAttendingCount((n) => clampAttendingCount(n + 1, allowance))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p
              className={
                fashion
                  ? "ff-rsvp-party-detail"
                  : memorial
                    ? "inv-rsvp-party-detail"
                    : "text-xs text-center opacity-80"
              }
              data-testid="rsvp-remaining-slots"
            >
              {slotGuidance.detail}
            </p>
          </div>
        ) : null}
      </div>
      {error ? (
        <p
          className={
            fashion ? "ff-rsvp-error" : memorial ? "inv-rsvp-error" : "text-sm text-red-500"
          }
        >
          {error}
        </p>
      ) : null}
      {fashion ? (
        <div className="ff-rsvp-choices" role="group" aria-label="Attendance reply">
          {choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className={`ff-rsvp-choice ff-rsvp-choice--${choice.tone}`}
              onClick={() => void handleRsvp(choice.id)}
              disabled={loading}
            >
              {choice.label}
            </button>
          ))}
        </div>
      ) : memorial ? (
        <div
          className="inv-rsvp-choices"
          role="group"
          aria-label="Attendance reply"
        >
          {choices.map((choice) => {
            const Icon = choice.icon;
            return (
              <button
                key={choice.id}
                type="button"
                className={`inv-rsvp-choice inv-rsvp-choice--${choice.tone}`}
                onClick={() => void handleRsvp(choice.id)}
                disabled={loading}
              >
                <span className="inv-rsvp-choice-icon" aria-hidden>
                  <Icon strokeWidth={2} />
                </span>
                <span className="inv-rsvp-choice-copy">
                  <span className="inv-rsvp-choice-label">{choice.label}</span>
                  {choice.whisper ? (
                    <span className="inv-rsvp-choice-whisper">{choice.whisper}</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className={btnClass}
            onClick={() => handleRsvp("ACCEPTED")}
            disabled={loading}
          >
            <Check className="h-4 w-4 mr-1" /> {choiceLabels?.accepted ?? t("rsvp.accept")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={btnClass}
            onClick={() => handleRsvp("DECLINED")}
            disabled={loading}
          >
            <X className="h-4 w-4 mr-1" /> {choiceLabels?.declined ?? t("rsvp.decline")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className={btnClass}
            onClick={() => handleRsvp("MAYBE")}
            disabled={loading}
          >
            <HelpCircle className="h-4 w-4 mr-1" /> {choiceLabels?.maybe ?? t("rsvp.maybe")}
          </Button>
        </div>
      )}
    </div>
  );
}
