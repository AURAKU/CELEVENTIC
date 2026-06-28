"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Share2, Check, MapPin, Phone, Clock, Shirt, Images, Armchair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvitationRenderer } from "@/components/invitation/invitation-renderer";
import { InvitationRsvpPanel } from "@/components/invitation/shared/invitation-rsvp-panel";
import { BlockRenderer } from "@/components/invitation-blocks/block-renderer";
import { useLocale } from "@/components/i18n/locale-provider";
import { PortalSection } from "@/components/guest-portal/portal-section";
import { AddToCalendarButton } from "@/components/guest-portal/add-to-calendar-button";
import { BrandedQrImage } from "@/components/qr/branded-qr-image";
import { AgiFooter } from "@/components/agi-engine/agi-badge";
import { FloatingCountdownPill } from "@/components/guest-portal/floating-countdown-pill";
import { InviteQuickChips } from "@/components/guest-portal/invite-quick-chips";
import type { PremiumInviteExperienceProps } from "@/components/invitation-mvp/premium-invite-experience";
import type { BlockRenderContext } from "@/lib/invitation-blocks/block-types";
import type { EventExperienceConfig, HubTabId } from "@/lib/experience/experience-types";
import { DEFAULT_HUB_TABS, DEFAULT_JOURNEY } from "@/lib/experience/experience-types";
import { ParticleEnvironment } from "@/components/experience/particle-environment";
import { UploadedMedia } from "@/components/media/uploaded-media";
import { CountdownDisplay } from "@/components/experience/countdown-display";
import { JourneyFlow } from "@/components/experience/journey-flow";
import { EventScheduleSection } from "@/components/experience/event-schedule-section";
import { StorybookJourney } from "@/components/experience/storybook-journey";
import { DEFAULT_SCHEDULE_SAMPLES, STORYBOOK_JOURNEY } from "@/lib/experience/experience-types";
import type { CountdownStyleId } from "@/lib/experience/experience-types";
import { resolveEventLifecycle } from "@/lib/experience/lifecycle";
import { EventDayBanner } from "@/components/experience/event-day-banner";
import { PostEventExperience } from "@/components/experience/post-event-experience";
import { CinematicInvitationSpotlight } from "@/components/guest-portal/cinematic-invitation-spotlight";

interface GuestInvitationPortalProps extends PremiumInviteExperienceProps {
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  rsvpRequired?: boolean;
  admissionQrDataUrl?: string | null;
  admissionQrToken?: string | null;
  guestQrToken?: string | null;
  seatLookupUrl?: string | null;
  seatQrDataUrl?: string | null;
  fullScreen?: boolean;
  /** Embedded inside a preview frame — no min-h-screen */
  embedded?: boolean;
  /** Full-screen cinematic slideshow (default for live invitations) */
  cinematicMode?: boolean;
  experienceConfig?: EventExperienceConfig;
  enabledHubTabs?: HubTabId[];
  openingComplete?: boolean;
}

function Countdown({ target, begunLabel, label, style }: { target: string; begunLabel: string; label: string; style?: CountdownStyleId }) {
  return (
    <CountdownDisplay
      targetIso={target}
      label={label}
      begunLabel={begunLabel}
      style={style ?? "classic"}
    />
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
    seatLookupUrl: props.seatLookupUrl ?? undefined,
  };

  const useBlocks = props.blocks && props.blocks.length > 0;
  const showRsvp = props.rsvpRequired !== false;

  const experience = props.experienceConfig;
  const hubTabs = props.enabledHubTabs ?? experience?.enabledTabs ?? DEFAULT_HUB_TABS;
  const hubMode = experience?.hubMode ?? "scroll";
  const countdownStyle = experience?.countdownStyle ?? "classic";
  const environmentId = experience?.environment ?? "none";
  const environmentIntensity = experience?.environmentIntensity ?? "medium";
  const journeyChapters = experience?.journeyChapters ?? DEFAULT_JOURNEY;
  const scheduleItems = experience?.scheduleItems;
  const displaySchedule = scheduleItems?.length ? scheduleItems : (hubTabs.includes("timeline") ? DEFAULT_SCHEDULE_SAMPLES : []);
  const thankYouMessage = experience?.thankYouMessage;
  const accent = props.design?.colors?.accent ?? "#0B8A83";
  const lifecyclePhase = resolveEventLifecycle(props.event.startDateRaw);
  const galleryCount = props.galleryUrls?.length ?? 0;

  const cinematicMode =
    props.cinematicMode !== false && props.fullScreen !== false && !useBlocks;

  if (cinematicMode) {
    return (
      <CinematicInvitationSpotlight
        {...props}
        embedded={props.embedded}
        backgroundImageUrl={props.backgroundImageUrl}
        backgroundVideoUrl={props.backgroundVideoUrl}
        rsvpRequired={props.rsvpRequired}
        admissionQrDataUrl={props.admissionQrDataUrl}
        admissionQrToken={props.admissionQrToken}
        guestQrToken={props.guestQrToken}
        seatLookupUrl={props.seatLookupUrl}
        seatQrDataUrl={props.seatQrDataUrl}
        experienceConfig={experience}
      />
    );
  }

  return (
    <div
      className={`${
        props.fullScreen !== false
          ? "fixed inset-0 overflow-y-auto min-h-[100dvh] w-full"
          : props.embedded
            ? "relative min-h-0 w-full"
            : "min-h-[100dvh] w-full"
      } bg-[#FAF8F4] relative overflow-x-hidden`}
      style={{ backgroundColor: props.design?.colors?.background ?? "#FAF8F4" }}
    >
      <ParticleEnvironment presetId={environmentId} intensity={environmentIntensity} />
      {(props.backgroundVideoUrl || props.backgroundImageUrl) && (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          {props.backgroundVideoUrl ? (
            <UploadedMedia
              src={props.backgroundVideoUrl}
              video
              className="w-full h-full object-cover opacity-20"
            />
          ) : props.backgroundImageUrl ? (
            <UploadedMedia
              src={props.backgroundImageUrl}
              alt=""
              className="w-full h-full object-cover opacity-15 animate-[ken-burns_20s_ease-in-out_infinite_alternate]"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F4]/80 via-[#FAF8F4]/90 to-[#FAF8F4]" />
        </div>
      )}

      <div className="relative z-10">
        <InvitationRenderer
          invitation={displayInvitation}
          event={displayEvent}
          design={props.design}
          guestId={props.guestId}
          guestName={props.guestName}
          qrDataUrl={props.qrDataUrl}
        />

        {!props.embedded && (
          <div className="mx-auto max-w-2xl px-4 py-4">
            <InviteQuickChips
            mapsLink={props.event.mapsLink}
            seatLookupUrl={props.seatLookupUrl}
            showRsvp={showRsvp}
            onRsvp={() => document.getElementById("rsvp")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            onCalendar={() => document.getElementById("quick-actions")?.scrollIntoView({ behavior: "smooth", block: "center" })}
          />
          </div>
        )}

        <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
          {lifecyclePhase === "event-day" && (
            <PortalSection id="event-day">
              <EventDayBanner
                eventTitle={displayEvent.title}
                venueName={displayEvent.venueName}
                seatLookupUrl={props.seatLookupUrl}
                mapsLink={props.event.mapsLink}
                accentColor={accent}
              />
            </PortalSection>
          )}

          <PortalSection id="welcome">
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

          {hubMode === "storybook" ? (
            <StorybookJourney chapters={experience?.journeyChapters ?? STORYBOOK_JOURNEY} accentColor={accent} />
          ) : hubMode === "journey" ? (
            <JourneyFlow chapters={journeyChapters}>
              {(chapter) => (
                <div className="rounded-2xl border bg-white/90 p-6 text-center">
                  <p className="text-sm text-slate-500 mb-2">{chapter.title}</p>
                  <p className="text-xs text-[#0B8A83]">Continue through your invitation journey</p>
                </div>
              )}
            </JourneyFlow>
          ) : null}

          {useBlocks ? (
            <PortalSection delay={80}>
              <BlockRenderer blocks={props.blocks!} context={blockContext} />
            </PortalSection>
          ) : (
            <>
              <PortalSection delay={100} id="countdown">
                <Countdown
                  target={props.event.startDateRaw ?? props.event.startDate}
                  label={t("invite.countdown")}
                  begunLabel={t("invite.celebration_begun")}
                  style={countdownStyle}
                />
              </PortalSection>

              {displaySchedule.length > 0 && (
              <PortalSection delay={120} id="schedule">
                <EventScheduleSection items={displaySchedule} accentColor={accent} />
              </PortalSection>
              )}

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
                        <UploadedMedia
                          key={url}
                          src={url}
                          alt=""
                          className="rounded-xl aspect-square object-cover inv-gallery-item"
                          video={/\.(mp4|webm|mov)(\?|$)/i.test(url)}
                        />
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

          {(props.qrDataUrl || props.admissionQrDataUrl || props.seatQrDataUrl) && (
            <PortalSection delay={400} id="pass">
              <div className="rounded-2xl border border-[#D4A63A]/30 bg-white p-6 text-center shadow-sm">
                <h2 className="font-display text-lg font-bold text-[#0F172A] mb-4">Your Pass</h2>
                {props.seatQrDataUrl && props.seatLookupUrl && (
                  <div className="mb-6 rounded-xl bg-[#0B8A83]/5 border border-[#0B8A83]/20 p-4">
                    <p className="text-xs text-slate-500 mb-2 flex items-center justify-center gap-1">
                      <Armchair className="h-3.5 w-3.5" /> Your table & seat
                    </p>
                    <BrandedQrImage src={props.seatQrDataUrl} size={160} showDownload caption="Scan to find your seat" />
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <a href={props.seatLookupUrl} target="_blank" rel="noopener noreferrer">View my seating</a>
                    </Button>
                  </div>
                )}
                {props.admissionQrDataUrl && (
                  <div className="mb-6">
                    <p className="text-xs text-slate-500 mb-3">Admission pass — show at the gate</p>
                    <BrandedQrImage
                      src={props.admissionQrDataUrl}
                      token={props.admissionQrToken ?? undefined}
                      size={280}
                      mode="pass"
                      allowFullscreen
                      guestName={props.guestName ?? undefined}
                      caption="Tap to enlarge · turn brightness up for scanning"
                      showDownload
                    />
                  </div>
                )}
                {props.qrDataUrl && (
                  <div>
                    <p className="text-xs text-slate-500 mb-3">Invitation QR</p>
                    <BrandedQrImage
                      src={props.qrDataUrl}
                      token={props.guestQrToken ?? undefined}
                      size={160}
                      showDownload={false}
                    />
                  </div>
                )}
              </div>
            </PortalSection>
          )}

          <PortalSection delay={420} id="gifts">
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur p-6 text-center shadow-sm">
              <h2 className="font-display text-lg font-bold text-[#0F172A] mb-2">Gifts & Contributions</h2>
              <p className="text-sm text-slate-600">Your presence is the greatest gift. Contact the host for registry details.</p>
            </div>
          </PortalSection>

          <PortalSection delay={430} id="memory">
            <div className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur p-6 text-center shadow-sm">
              <h2 className="font-display text-lg font-bold text-[#0F172A] mb-2">Memory Vault</h2>
              <p className="text-sm text-slate-600">
                {props.memoryVaultEnabled
                  ? "Share photos and videos after the celebration — your memories live here forever."
                  : "Memories from this event will appear here after the celebration."}
              </p>
            </div>
          </PortalSection>

          {lifecyclePhase === "post-event" && (
            <PortalSection delay={435} id="post-event">
              <PostEventExperience
                eventTitle={displayEvent.title}
                memoryVaultEnabled={props.memoryVaultEnabled}
                galleryCount={galleryCount}
                accentColor={accent}
                thankYouMessage={thankYouMessage}
              />
            </PortalSection>
          )}

          <PortalSection delay={440} id="thank-you">
            <div className="rounded-2xl border border-[#D4A63A]/25 bg-gradient-to-br from-white to-[#FAF8F4] p-8 text-center shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-[#D4A63A] mb-3">With love</p>
              <p className="font-display text-lg text-[#0F172A] leading-relaxed">
                {thankYouMessage ?? "Thank you for being part of our celebration. We cannot wait to share this moment with you."}
              </p>
            </div>
          </PortalSection>

          <PortalSection delay={450} id="quick-actions">
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

          <div className="text-center space-y-2 pb-24">
            <p className="text-xs text-slate-400">
              <Link href="/" className="text-[#0B8A83] hover:underline">Celeventic</Link> — {t("invite.tagline")}
            </p>
            <AgiFooter />
          </div>
        </div>

        {!props.embedded && props.event.startDateRaw && (
          <FloatingCountdownPill
            targetIso={props.event.startDateRaw}
            label={t("invite.countdown")}
            begunLabel={t("invite.celebration_begun")}
          />
        )}
      </div>
    </div>
  );
}
