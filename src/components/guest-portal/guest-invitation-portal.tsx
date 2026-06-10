"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Share2, Check, MapPin, Phone, Clock, Shirt, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvitationRenderer } from "@/components/invitation/invitation-renderer";
import { InvitationRsvpPanel } from "@/components/invitation/shared/invitation-rsvp-panel";
import { BlockRenderer } from "@/components/invitation-blocks/block-renderer";
import { useLocale } from "@/components/i18n/locale-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { PortalSection } from "@/components/guest-portal/portal-section";
import { AddToCalendarButton } from "@/components/guest-portal/add-to-calendar-button";
import { AgiFooter } from "@/components/agi-engine/agi-badge";
import type { PremiumInviteExperienceProps } from "@/components/invitation-mvp/premium-invite-experience";
import type { BlockRenderContext } from "@/lib/invitation-blocks/block-types";

interface GuestInvitationPortalProps extends PremiumInviteExperienceProps {
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  rsvpRequired?: boolean;
  admissionQrDataUrl?: string | null;
}

function Countdown({ target, begunLabel, label }: { target: string; begunLabel: string; label: string }) {
  const [left, setLeft] = useState("");
  useEffect(() => {
    function tick() {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setLeft(begunLabel); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLeft(`${d}d ${h}h ${m}m`);
    }
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [target, begunLabel]);
  return (
    <div className="rounded-2xl bg-[#0F172A] text-white p-6 text-center inv-countdown-pulse">
      <Clock className="h-6 w-6 mx-auto text-[#D4A63A] mb-2" />
      <p className="text-xs uppercase tracking-widest text-white/60">{label}</p>
      <p className="font-display text-2xl font-bold mt-2">{left}</p>
    </div>
  );
}

export function GuestInvitationPortal(props: GuestInvitationPortalProps) {
  const { t, locale } = useLocale();
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const localized = props.localizedVersions?.[locale];
  const displayEvent = useMemo(() => ({
    ...props.event,
    title: localized?.eventTitle ?? props.event.title,
    description: localized?.story ?? props.event.description,
    dressCode: localized?.dressCode ?? props.event.dressCode,
    venueName: localized?.venueName ?? props.event.venueName,
    landmark: localized?.landmark ?? props.event.landmark,
    hostName: localized?.hostName ?? props.event.hostName,
  }), [props.event, localized]);

  const displayInvitation = useMemo(() => ({
    ...props.invitation,
    name: localized?.eventTitle ?? props.invitation.name,
    message: localized?.story ?? props.invitation.message,
  }), [props.invitation, localized]);

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title: displayEvent.title, url: shareUrl });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const blockContext: BlockRenderContext = {
    eventTitle: displayEvent.title,
    hostName: displayEvent.hostName,
    eventDate: displayEvent.startDate,
    eventDateRaw: props.event.startDateRaw,
    venueName: displayEvent.venueName ?? undefined,
    landmark: displayEvent.landmark ?? undefined,
    mapsLink: props.event.mapsLink ?? undefined,
    dressCode: displayEvent.dressCode ?? undefined,
    story: displayEvent.description ?? undefined,
    contactPhone: props.event.contactPhone ?? undefined,
    invitationId: props.invitation.id,
    guestId: props.guestId,
    guestName: props.guestName,
    qrDataUrl: props.qrDataUrl,
    memoryVaultEnabled: props.memoryVaultEnabled,
    eventId: props.eventId,
  };

  const useBlocks = props.blocks && props.blocks.length > 0;
  const showRsvp = props.rsvpRequired !== false;

  return (
    <div className="min-h-screen bg-[#FAF8F4] relative">
      {(props.backgroundVideoUrl || props.backgroundImageUrl) && (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          {props.backgroundVideoUrl ? (
            <video
              autoPlay muted loop playsInline
              className="w-full h-full object-cover opacity-20"
              src={props.backgroundVideoUrl}
            />
          ) : props.backgroundImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={props.backgroundImageUrl} alt="" className="w-full h-full object-cover opacity-15 animate-[ken-burns_20s_ease-in-out_infinite_alternate]" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F4]/80 via-[#FAF8F4]/90 to-[#FAF8F4]" />
        </div>
      )}

      <div className="relative z-10">
        {props.allowedLocales && props.allowedLocales.length > 1 && (
          <div className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/90 backdrop-blur-xl">
            <div className="mx-auto max-w-2xl flex items-center justify-between px-4 py-2">
              <span className="text-xs font-medium text-slate-500">{t("invite.guest_language")}</span>
              <LanguageSwitcher compact allowedLocales={props.allowedLocales} />
            </div>
          </div>
        )}

        <InvitationRenderer
          invitation={displayInvitation}
          event={displayEvent}
          design={props.design}
          guestId={props.guestId}
          guestName={props.guestName}
          qrDataUrl={props.qrDataUrl}
        />

        <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
          <PortalSection>
            <div className="text-center space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-[#0B8A83]">Welcome</p>
              {props.guestName ? (
                <h2 className="font-display text-2xl font-bold text-[#0F172A]">
                  {t("invite.welcome", { name: props.guestName })}
                </h2>
              ) : (
                <h2 className="font-display text-2xl font-bold text-[#0F172A]">{displayEvent.title}</h2>
              )}
              <p className="text-slate-500 text-sm">Hosted by {displayEvent.hostName}</p>
            </div>
          </PortalSection>

          {useBlocks ? (
            <PortalSection delay={80}>
              <BlockRenderer blocks={props.blocks!} context={blockContext} />
            </PortalSection>
          ) : (
            <>
              <PortalSection delay={100}>
                <Countdown target={props.event.startDateRaw} label={t("invite.countdown")} begunLabel={t("invite.celebration_begun")} />
              </PortalSection>

              {displayEvent.description && (
                <PortalSection delay={150} id="story">
                  <div className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur p-6 shadow-sm">
                    <h2 className="font-display text-lg font-bold text-[#0F172A]">{t("invite.our_story")}</h2>
                    <p className="mt-3 text-slate-600 leading-relaxed whitespace-pre-line">{displayEvent.description}</p>
                  </div>
                </PortalSection>
              )}

              <PortalSection delay={200} id="details">
                <div className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur p-6 space-y-4 shadow-sm">
                  <h2 className="font-display text-lg font-bold text-[#0F172A]">Event Details</h2>
                  <div className="space-y-3 text-sm text-slate-600">
                    <p className="flex items-start gap-2"><Clock className="h-4 w-4 text-[#D4A63A] mt-0.5 shrink-0" />{displayEvent.startDate}</p>
                    {(displayEvent.venueName || displayEvent.landmark) && (
                      <p className="flex items-start gap-2"><MapPin className="h-4 w-4 text-[#D4A63A] mt-0.5 shrink-0" />{displayEvent.venueName}{displayEvent.landmark ? ` · ${displayEvent.landmark}` : ""}</p>
                    )}
                    {displayEvent.dressCode && (
                      <p className="flex items-start gap-2"><Shirt className="h-4 w-4 text-[#D4A63A] mt-0.5 shrink-0" />{displayEvent.dressCode}</p>
                    )}
                  </div>
                  {props.event.mapsLink && (
                    <Button variant="outline" size="sm" asChild className="mt-2">
                      <a href={props.event.mapsLink} target="_blank" rel="noopener noreferrer">
                        <MapPin className="h-4 w-4" /> Get Directions
                      </a>
                    </Button>
                  )}
                </div>
              </PortalSection>

              {props.galleryUrls && props.galleryUrls.length > 0 && (
                <PortalSection delay={250} id="gallery">
                  <div className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur p-6 shadow-sm">
                    <h2 className="font-display text-lg font-bold text-[#0F172A] flex items-center gap-2"><Images className="h-5 w-5 text-[#0B8A83]" /> Gallery</h2>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {props.galleryUrls.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={url} src={url} alt="" className="rounded-xl aspect-square object-cover inv-gallery-item" style={{ animationDelay: `${i * 80}ms` }} />
                      ))}
                    </div>
                  </div>
                </PortalSection>
              )}
            </>
          )}

          {showRsvp && !useBlocks && (
            <PortalSection delay={300} id="rsvp">
              <div className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur p-6 shadow-sm">
                <h2 className="font-display text-lg font-bold text-[#0F172A] mb-4">{t("rsvp.title")}</h2>
                <InvitationRsvpPanel
                  invitationId={props.invitation.id}
                  guestId={props.guestId}
                  guestName={props.guestName}
                  accentColor={props.design.colors?.accent ?? "#0B8A83"}
                />
              </div>
            </PortalSection>
          )}

          {props.event.contactPhone && (
            <PortalSection delay={350} id="contact">
              <div className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur p-6 text-center shadow-sm">
                <h2 className="font-display text-lg font-bold text-[#0F172A] mb-3">Contact Host</h2>
                <div className="flex flex-wrap justify-center gap-3">
                  {props.event.contactPhone && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`tel:${props.event.contactPhone}`}><Phone className="h-4 w-4" /> Call</a>
                    </Button>
                  )}
                </div>
              </div>
            </PortalSection>
          )}

          {(props.qrDataUrl || props.admissionQrDataUrl) && (
            <PortalSection delay={400} id="pass">
              <div className="rounded-2xl border border-[#D4A63A]/30 bg-white p-6 text-center shadow-sm">
                <h2 className="font-display text-lg font-bold text-[#0F172A] mb-4">Your Pass</h2>
                {props.qrDataUrl && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 mb-2">Invitation QR</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={props.qrDataUrl} alt="Invitation QR" className="mx-auto w-36 h-36 rounded-xl border" />
                  </div>
                )}
                {props.admissionQrDataUrl && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Admission QR</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={props.admissionQrDataUrl} alt="Admission QR" className="mx-auto w-36 h-36 rounded-xl border" />
                  </div>
                )}
              </div>
            </PortalSection>
          )}

          <PortalSection delay={450}>
            <div className="flex flex-wrap gap-3 justify-center">
              <AddToCalendarButton
                title={displayEvent.title}
                startDateRaw={props.event.startDateRaw}
                venue={displayEvent.venueName ?? undefined}
                description={displayEvent.description ?? undefined}
              />
              <Button variant="outline" onClick={handleShare}>
                {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                {copied ? t("invite.copied") : t("invite.share")}
              </Button>
            </div>
          </PortalSection>

          <div className="text-center space-y-2 pb-10">
            <p className="text-xs text-slate-400">
              <Link href="/" className="text-[#0B8A83] hover:underline">Celeventic</Link> — {t("invite.tagline")}
            </p>
            <AgiFooter />
          </div>
        </div>
      </div>
    </div>
  );
}
