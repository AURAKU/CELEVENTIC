"use client";

import { useState } from "react";
import { Loader2, Mail, MessageCircle, Phone } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { useInvitationStaticPreview } from "@/components/invitation/invitation-static-preview";
import { isPreviewInvitationId } from "@/lib/invitation/guest-portal-actions";
import { buildWhatsAppUrl, buildEmailUrl } from "@/lib/invitation/guest-portal-actions";
import { cn } from "@/lib/utils";
import { TM_PALETTE as PALETTE } from "./traditional-marriage-palette";

export interface TraditionalMarriageRespondProps {
  invitationId: string;
  guestId?: string;
  guestName?: string | null;
  eventTitle: string;
  rsvpHeading?: string;
  showRsvp: boolean;
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
 * Kindly Respond — theme-native RSVP + quiet host reach.
 * No magenta ribbons, chevrons, or generic utility card chrome.
 */
export function TraditionalMarriageRespond({
  invitationId,
  guestId,
  guestName: initialGuestName,
  eventTitle,
  rsvpHeading = "R.S.V.P",
  showRsvp,
  organizerPhone,
  organizerEmail,
}: TraditionalMarriageRespondProps) {
  const { t } = useLocale();
  const staticPreview = useInvitationStaticPreview();
  const [rsvpStatus, setRsvpStatus] = useState<RsvpChoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [guestName, setGuestName] = useState(initialGuestName?.trim() ?? "");
  const [email, setEmail] = useState("");
  const [pressed, setPressed] = useState<RsvpChoice | null>(null);

  const showReachHosts = Boolean(organizerPhone || organizerEmail);
  if (!showRsvp && !showReachHosts) return null;

  async function handleRsvp(response: RsvpChoice) {
    if (staticPreview) return;
    if (isPreviewInvitationId(invitationId)) {
      setError("Preview mode — RSVP works on your published invitation link.");
      return;
    }
    setError("");
    setLoading(true);
    setPressed(response);

    const payload = guestId
      ? { guestId, response }
      : { invitationId, guestName: guestName.trim(), email: email.trim() || undefined, response };

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
      if (res.ok) setRsvpStatus(response);
      else setError(data.error || t("rsvp.submit_failed"));
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
              <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.08em]">
                Your reply has been received with gratitude.
              </p>
            </div>
          ) : (
            <>
              {!guestId && (
                <div className="space-y-2.5">
                  <label className="sr-only" htmlFor="tm-rsvp-name">
                    {t("rsvp.your_name")}
                  </label>
                  <input
                    id="tm-rsvp-name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder={t("rsvp.your_name")}
                    autoComplete="name"
                    className={fieldClass}
                    style={fieldStyle}
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
                </div>
              )}

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
                  <MessageCircle className="h-3 w-3" aria-hidden /> WhatsApp
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
                  <MessageCircle className="h-3 w-3" aria-hidden /> WhatsApp
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
                  <Mail className="h-3 w-3" aria-hidden /> Write
                </span>
              ) : (
                <a
                  href={buildEmailUrl(organizerEmail, `Regarding: ${eventTitle}`)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-[family-name:var(--font-cormorant)] text-[12px] tracking-[0.14em] uppercase underline-offset-[3px] hover:underline transition-opacity hover:opacity-80"
                  style={{ color: PALETTE.bronzeDeep }}
                >
                  <Mail className="h-3 w-3" aria-hidden /> Write
                </a>
              ))}
          </div>
        </div>
      )}
    </section>
  );
}
