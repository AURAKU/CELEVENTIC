"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Minus, Phone, Plus } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { useInvitationStaticPreview } from "@/components/invitation/invitation-static-preview";
import { isPreviewInvitationId } from "@/lib/invitation/guest-portal-actions";
import { buildWhatsAppUrl, buildEmailUrl } from "@/lib/invitation/guest-portal-actions";
import {
  clampAttendingCount,
  rsvpAcceptedThankYou,
  rsvpPartyCapacityLine,
  rsvpPartySlotGuidance,
} from "@/lib/invitation/rsvp-party-slots";
import { cn } from "@/lib/utils";
import { TM_PALETTE as PALETTE } from "./traditional-marriage-palette";

/** Official WhatsApp glyph for Reach the Hosts. */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export interface TraditionalMarriageRespondProps {
  invitationId: string;
  guestId?: string;
  guestName?: string | null;
  eventTitle: string;
  rsvpHeading?: string;
  showRsvp: boolean;
  /** Organiser-set heads this invitation admits (gate + RSVP ceiling). */
  partyAllowance?: number;
  organizerPhone?: string | null;
  organizerEmail?: string | null;
}

type RsvpChoice = "ACCEPTED" | "DECLINED" | "MAYBE";

const CHOICES: { id: RsvpChoice; label: string; whisper: string }[] = [
  { id: "ACCEPTED", label: "Accept", whisper: "With joy" },
  { id: "DECLINED", label: "Decline", whisper: "With regret" },
  { id: "MAYBE", label: "Maybe", whisper: "Still hoping" },
];

/**
 * Kindly Respond, theme-native RSVP + quiet host reach.
 * No magenta ribbons, chevrons, or generic utility card chrome.
 */
export function TraditionalMarriageRespond({
  invitationId,
  guestId,
  guestName: initialGuestName,
  eventTitle,
  rsvpHeading = "R.S.V.P",
  showRsvp,
  partyAllowance = 1,
  organizerPhone,
  organizerEmail,
}: TraditionalMarriageRespondProps) {
  const { t } = useLocale();
  const staticPreview = useInvitationStaticPreview();
  const allowance = Math.max(1, Math.trunc(partyAllowance || 1));
  const [rsvpStatus, setRsvpStatus] = useState<RsvpChoice | null>(null);
  const [confirmedAttending, setConfirmedAttending] = useState(allowance);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [guestName, setGuestName] = useState(initialGuestName?.trim() ?? "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [attendingCount, setAttendingCount] = useState(allowance);
  const [pressed, setPressed] = useState<RsvpChoice | null>(null);

  useEffect(() => {
    setAttendingCount((prev) => clampAttendingCount(prev, allowance));
  }, [allowance]);

  const nameLocked = Boolean(guestId && guestName.trim());
  const showReachHosts = Boolean(organizerPhone || organizerEmail);
  const capacityLine = rsvpPartyCapacityLine(allowance);
  const slotGuidance = useMemo(
    () => rsvpPartySlotGuidance(allowance, attendingCount),
    [allowance, attendingCount]
  );
  const needsPartySlots = allowance > 1;

  if (!showRsvp && !showReachHosts) return null;

  async function handleRsvp(response: RsvpChoice) {
    if (staticPreview) return;
    if (isPreviewInvitationId(invitationId)) {
      setError("Preview mode, RSVP works on your published invitation link.");
      return;
    }
    setError("");
    setLoading(true);
    setPressed(response);

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
      setPressed(null);
      return;
    }

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setConfirmedAttending(cappedAttending);
        setRsvpStatus(response);
      } else setError(data.error || t("rsvp.submit_failed"));
    } catch {
      setError(t("rsvp.submit_failed"));
    } finally {
      setLoading(false);
      setPressed(null);
    }
  }

  const fieldClass =
    "w-full min-h-[48px] rounded-sm border px-3.5 text-[15px] tracking-wide outline-none transition-[border-color,box-shadow] duration-300 placeholder:opacity-55 focus:shadow-[0_0_0_3px_rgba(184,150,62,0.18)]";
  const fieldStyle = {
    borderColor: PALETTE.border,
    backgroundColor: `${PALETTE.linen}F2`,
    color: PALETTE.ink,
    fontFamily: "var(--font-cormorant), 'Cormorant Garamond', serif",
  } as const;

  return (
    <section
      id="rsvp"
      aria-labelledby="tm-respond-heading"
      className="tm-section-rise relative overflow-hidden rounded-sm border px-5 py-8 sm:px-7 sm:py-9 shadow-[0_22px_48px_-28px_rgba(92,61,46,0.42)]"
      style={{
        borderColor: PALETTE.border,
        background: `
          linear-gradient(165deg, ${PALETTE.peach} 0%, ${PALETTE.linen} 46%, ${PALETTE.peachDeep} 100%),
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 11px,
            rgba(161,131,115,0.03) 11px,
            rgba(161,131,115,0.03) 12px
          )
        `,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-70"
        style={{
          background: `radial-gradient(ellipse at 50% -10%, ${PALETTE.mustardSoft}40 0%, transparent 68%)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-3 rounded-sm border opacity-40"
        style={{ borderColor: `${PALETTE.mustard}55` }}
        aria-hidden
      />

      <div className="relative text-center space-y-2.5">
        <p
          className="font-[family-name:var(--font-cormorant)] text-[11px] tracking-[0.36em] uppercase"
          style={{ color: PALETTE.bronzeDeep }}
        >
          {rsvpHeading}
        </p>
        <h2
          id="tm-respond-heading"
          className="font-[family-name:var(--font-great-vibes)] text-[2.5rem] sm:text-[2.85rem] leading-none"
          style={{ color: PALETTE.bronze }}
        >
          Kindly Respond
        </h2>
        <p
          className="font-[family-name:var(--font-cormorant)] text-sm sm:text-[0.95rem] leading-relaxed max-w-[18.5rem] mx-auto"
          style={{ color: PALETTE.dress }}
        >
          {showRsvp && showReachHosts
            ? "Share whether you will join us, or quietly reach the hosts."
            : showRsvp
              ? "We would be honoured by your reply."
              : "Reach the hosts with a question or kind note."}
        </p>
        {showRsvp ? (
          <p
            className="font-[family-name:var(--font-cormorant)] text-[14px] font-semibold tracking-[0.04em] sm:text-[15px] max-w-[22rem] mx-auto"
            style={{ color: PALETTE.bronzeDeep }}
            data-testid="rsvp-capacity"
          >
            {capacityLine}
          </p>
        ) : null}
      </div>

      <div
        className="tm-hairline relative mx-auto mt-6 mb-6 h-px w-20"
        style={{ backgroundColor: `${PALETTE.mustard}70` }}
        aria-hidden
      />

      {showRsvp && (
        <div className="relative space-y-4">
          {rsvpStatus ? (
            <div
              className="tm-section-rise text-center px-4 py-5 rounded-sm border"
              style={{
                borderColor: `${PALETTE.mustard}66`,
                backgroundColor: `${PALETTE.peach}CC`,
                color: PALETTE.bronzeDeep,
              }}
            >
              <p className="font-[family-name:var(--font-great-vibes)] text-[1.85rem] leading-none mb-1.5">
                Thank you
              </p>
              <p className="font-[family-name:var(--font-cormorant)] text-sm sm:text-[0.95rem] leading-relaxed tracking-[0.04em]">
                {rsvpStatus === "ACCEPTED"
                  ? rsvpAcceptedThankYou(confirmedAttending, allowance)
                  : "Your reply has been received with gratitude. The hosts have been notified for seating and planning."}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2.5">
                <label className="sr-only" htmlFor="tm-rsvp-name">
                  {t("rsvp.your_name")}
                </label>
                <input
                  id="tm-rsvp-name"
                  value={guestName}
                  onChange={(e) => {
                    if (!nameLocked) setGuestName(e.target.value);
                  }}
                  placeholder={t("rsvp.your_name")}
                  autoComplete="name"
                  readOnly={nameLocked}
                  aria-readonly={nameLocked || undefined}
                  title={nameLocked ? t("rsvp.name_locked") : undefined}
                  className={cn(fieldClass, nameLocked && "cursor-default opacity-90")}
                  style={{
                    ...fieldStyle,
                    ...(nameLocked
                      ? {
                          backgroundColor: `${PALETTE.peach}F0`,
                          borderColor: `${PALETTE.mustard}88`,
                        }
                      : null),
                  }}
                  disabled={staticPreview || loading}
                />
                <label className="sr-only" htmlFor="tm-rsvp-email">
                  {t("rsvp.your_email")}
                </label>
                <input
                  id="tm-rsvp-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("rsvp.your_email")}
                  autoComplete="email"
                  className={fieldClass}
                  style={fieldStyle}
                  disabled={staticPreview || loading}
                />
                <label className="sr-only" htmlFor="tm-rsvp-phone">
                  {t("rsvp.your_phone")}
                </label>
                <input
                  id="tm-rsvp-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("rsvp.your_phone")}
                  autoComplete="tel"
                  className={fieldClass}
                  style={fieldStyle}
                  disabled={staticPreview || loading}
                />

                {needsPartySlots ? (
                  <div
                    className="rounded-sm border px-3.5 py-3.5 space-y-3 text-left"
                    style={{
                      borderColor: `${PALETTE.mustard}88`,
                      backgroundColor: `${PALETTE.peach}EE`,
                    }}
                    data-testid="rsvp-party-slots"
                  >
                    <div>
                      <p
                        className="font-[family-name:var(--font-cormorant)] text-[11px] tracking-[0.2em] uppercase font-semibold"
                        style={{ color: PALETTE.bronzeDeep }}
                      >
                        Party seats
                      </p>
                      <p
                        className="mt-1 font-[family-name:var(--font-cormorant)] text-[14px] leading-snug"
                        style={{ color: PALETTE.dress }}
                      >
                        Choose how many people from this invitation will attend. The hosts use this
                        exact number for planning.
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        aria-label="Fewer attending"
                        disabled={staticPreview || loading || attendingCount <= 1}
                        onClick={() =>
                          setAttendingCount((n) => clampAttendingCount(n - 1, allowance))
                        }
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border transition-opacity disabled:opacity-35"
                        style={{
                          borderColor: PALETTE.mustard,
                          backgroundColor: `${PALETTE.linen}F5`,
                          color: PALETTE.bronzeDeep,
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <div className="min-w-0 flex-1 text-center">
                        <p
                          id="tm-rsvp-attending"
                          className="font-[family-name:var(--font-cormorant)] text-[1.65rem] font-semibold leading-none tabular-nums"
                          style={{ color: PALETTE.ink }}
                          aria-live="polite"
                          data-testid="rsvp-attending-count"
                        >
                          {slotGuidance.confirmed}
                          <span
                            className="text-[1rem] font-normal opacity-70"
                            style={{ color: PALETTE.bronzeDeep }}
                          >
                            {" "}
                            / {allowance}
                          </span>
                        </p>
                        <p
                          className="mt-1.5 font-[family-name:var(--font-cormorant)] text-[13px] leading-snug font-medium"
                          style={{ color: PALETTE.bronzeDeep }}
                        >
                          {slotGuidance.summary}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="More attending"
                        disabled={staticPreview || loading || attendingCount >= allowance}
                        onClick={() =>
                          setAttendingCount((n) => clampAttendingCount(n + 1, allowance))
                        }
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border transition-opacity disabled:opacity-35"
                        style={{
                          borderColor: PALETTE.mustard,
                          backgroundColor: `${PALETTE.linen}F5`,
                          color: PALETTE.bronzeDeep,
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <p
                      className="font-[family-name:var(--font-cormorant)] text-[12.5px] leading-relaxed text-center"
                      style={{ color: PALETTE.dress }}
                      data-testid="rsvp-remaining-slots"
                    >
                      {slotGuidance.detail}
                    </p>
                  </div>
                ) : null}
              </div>

              {error && (
                <p
                  className="text-center font-[family-name:var(--font-cormorant)] text-sm"
                  style={{ color: "#9B3D3D" }}
                  role="alert"
                >
                  {error}
                </p>
              )}

              <div
                role="group"
                aria-label="RSVP response"
                className="grid grid-cols-3 gap-2 sm:gap-2.5"
              >
                {CHOICES.map((choice) => {
                  const isBusy = loading && pressed === choice.id;
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      disabled={staticPreview || loading}
                      onClick={() => void handleRsvp(choice.id)}
                      className={cn(
                        "group relative flex flex-col items-center justify-center gap-1 min-h-[72px] px-1.5 py-3 rounded-sm border transition-all duration-300",
                        "touch-manipulation select-none",
                        "hover:brightness-[1.02] active:scale-[0.975]",
                        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                        "disabled:opacity-45 disabled:pointer-events-none"
                      )}
                      style={{
                        borderColor: PALETTE.mustard,
                        color: PALETTE.bronzeDeep,
                        backgroundColor: `${PALETTE.peach}F0`,
                        outlineColor: PALETTE.bronze,
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
                      }}
                    >
                      {isBusy ? (
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          style={{ color: PALETTE.mustard }}
                          aria-hidden
                        />
                      ) : (
                        <>
                          <span className="font-[family-name:var(--font-cormorant)] text-[12px] sm:text-[13px] tracking-[0.18em] uppercase font-medium">
                            {choice.label}
                          </span>
                          <span
                            className="font-[family-name:var(--font-great-vibes)] text-[1.05rem] leading-none opacity-80 group-hover:opacity-100 transition-opacity"
                            style={{ color: PALETTE.bronze }}
                          >
                            {choice.whisper}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {showReachHosts && (
        <div
          id="contact"
          className={cn("relative", showRsvp ? "mt-7 pt-5 border-t" : "mt-1")}
          style={{ borderColor: `${PALETTE.border}CC` }}
        >
          <p
            className="text-center font-[family-name:var(--font-cormorant)] text-[10px] tracking-[0.3em] uppercase mb-3"
            style={{ color: `${PALETTE.bronzeDeep}CC` }}
          >
            Reach the hosts
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2">
            {organizerPhone &&
              (staticPreview ? (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-[family-name:var(--font-cormorant)] text-[12px] tracking-[0.14em] uppercase opacity-50"
                  style={{ color: PALETTE.bronzeDeep }}
                >
                  <Phone className="h-3 w-3" aria-hidden /> Call
                </span>
              ) : (
                <a
                  href={`tel:${organizerPhone}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-[family-name:var(--font-cormorant)] text-[12px] tracking-[0.14em] uppercase underline-offset-[3px] hover:underline transition-opacity hover:opacity-80"
                  style={{ color: PALETTE.bronzeDeep }}
                >
                  <Phone className="h-3 w-3" aria-hidden /> Call
                </a>
              ))}
            {organizerPhone && organizerEmail && (
              <span className="mx-1 text-[10px] select-none" style={{ color: `${PALETTE.bronze}66` }} aria-hidden>
                ·
              </span>
            )}
            {organizerPhone &&
              (staticPreview ? (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-[family-name:var(--font-cormorant)] text-[12px] tracking-[0.14em] uppercase opacity-50"
                  style={{ color: PALETTE.bronzeDeep }}
                >
                  <WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp
                </span>
              ) : (
                <a
                  href={buildWhatsAppUrl(
                    organizerPhone,
                    `Hi! I received your invitation for ${eventTitle}.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-[family-name:var(--font-cormorant)] text-[12px] tracking-[0.14em] uppercase underline-offset-[3px] hover:underline transition-opacity hover:opacity-80"
                  style={{ color: PALETTE.bronzeDeep }}
                >
                  <WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp
                </a>
              ))}
            {organizerEmail && (organizerPhone ? (
              <span className="mx-1 text-[10px] select-none" style={{ color: `${PALETTE.bronze}66` }} aria-hidden>
                ·
              </span>
            ) : null)}
            {organizerEmail &&
              (staticPreview ? (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-[family-name:var(--font-cormorant)] text-[12px] tracking-[0.14em] uppercase opacity-50"
                  style={{ color: PALETTE.bronzeDeep }}
                >
                  <Mail className="h-3 w-3" aria-hidden /> Email
                </span>
              ) : (
                <a
                  href={buildEmailUrl(organizerEmail, `Regarding: ${eventTitle}`)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-[family-name:var(--font-cormorant)] text-[12px] tracking-[0.14em] uppercase underline-offset-[3px] hover:underline transition-opacity hover:opacity-80"
                  style={{ color: PALETTE.bronzeDeep }}
                >
                  <Mail className="h-3 w-3" aria-hidden /> Email
                </a>
              ))}
          </div>
        </div>
      )}
    </section>
  );
}
