"use client";

import { useMemo } from "react";
import { Phone, Clock, Shirt, Images, Armchair, Mail, MessageCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvitationRenderer } from "@/components/invitation/invitation-renderer";
import { InvitationRsvpPanel } from "@/components/invitation/shared/invitation-rsvp-panel";
import { BlockRenderer } from "@/components/invitation-blocks/block-renderer";
import { useLocale } from "@/components/i18n/locale-provider";
import { PortalSection } from "@/components/guest-portal/portal-section";
import { BrandedQrImage } from "@/components/qr/branded-qr-image";
import { ManualGateCodeReveal } from "@/components/qr/manual-gate-code-reveal";
import { FloatingCountdownPill } from "@/components/guest-portal/floating-countdown-pill";
import { InvitationFeatureDock } from "@/components/guest-portal/invitation-feature-dock";
import { SaveDateCalendarCard } from "@/components/guest-portal/save-date-calendar-card";
import { VenueMapEmbed } from "@/components/guest-portal/venue-map-embed";
import { GuestWishesCard } from "@/components/guest-portal/guest-wishes-card";
import { GiftQrBox } from "@/components/guest-portal/gift-qr-box";
import { InvitationMemoryAlbumCard } from "@/components/guest-portal/invitation-memory-album-card";
import { useGuestPortalActions } from "@/hooks/use-guest-portal-actions";
import { buildWhatsAppUrl, buildEmailUrl, isPreviewInvitationId } from "@/lib/invitation/guest-portal-actions";
import { PagedInvitationViewer } from "@/components/invitation-paged/paged-invitation-viewer";
import { categoryForBlueprint } from "@/lib/invite-blueprints/blueprint-registry";
import type { PremiumInviteExperienceProps } from "@/components/invitation-mvp/premium-invite-experience";
import type { BlockRenderContext } from "@/lib/invitation-blocks/block-types";
import type { EventExperienceConfig, HubTabId } from "@/lib/experience/experience-types";
import { DEFAULT_HUB_TABS, DEFAULT_JOURNEY } from "@/lib/experience/experience-types";
import { enabledTabsFromScenes } from "@/lib/invitation-studio/studio-scenes";
import { layerZIndexMap, type StudioLayerId } from "@/lib/invitation-studio/studio-layers";
import { ParticleEnvironment } from "@/components/experience/particle-environment";
import { ExperienceBackgroundLayer } from "@/components/experience/experience-background-layer";
import { InvitationGalleryDisplay } from "@/components/invitation/invitation-gallery-display";
import { galleryItemsFromUrls } from "@/lib/invitation/studio-media-utils";
import { getMediaEntranceClass, getMediaEntranceForLayout } from "@/lib/invitation/media-entrance-engine";
import { mapExperienceSlideshowStyle } from "@/lib/experience/experience-engine-v2";
import type { SlideshowStyleId } from "@/lib/invitation/slideshow-styles";
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
import { InviteViewportShell } from "@/components/invitation/invite-viewport-shell";

interface GuestInvitationPortalProps extends PremiumInviteExperienceProps {
  backgroundImageUrl?: string | null;
  backgroundVideoUrl?: string | null;
  rsvpRequired?: boolean;
  admissionQrDataUrl?: string | null;
  admissionQrToken?: string | null;
  admissionManualCode?: string | null;
  guestQrToken?: string | null;
  seatLookupUrl?: string | null;
  seatQrDataUrl?: string | null;
  fullScreen?: boolean;
  /** Embedded inside a preview frame — no min-h-screen */
  embedded?: boolean;
  /** Swipe/arrow gallery navigation (defaults to !embedded) */
  galleryInteractive?: boolean;
  /** Full-screen cinematic slideshow (default for live invitations) */
  cinematicMode?: boolean;
  experienceConfig?: EventExperienceConfig;
  enabledHubTabs?: HubTabId[];
  /** Optional organizer email (from invitation order) */
  contactEmail?: string | null;
  menuUrl?: string | null;
  menuBody?: string | null;
  registryUrl?: string | null;
  seatingEnabled?: boolean;
  openingComplete?: boolean;
  seatTable?: string | null;
  seatLabel?: string | null;
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

  const experience = props.experienceConfig;
  const hubTabs = useMemo(() => {
    if (props.enabledHubTabs?.length) return props.enabledHubTabs;
    if (experience?.scenes?.length) return enabledTabsFromScenes(experience.scenes);
    return experience?.enabledTabs ?? DEFAULT_HUB_TABS;
  }, [props.enabledHubTabs, experience?.scenes, experience?.enabledTabs]);
  const showRsvp = props.rsvpRequired !== false && hubTabs.includes("rsvp");
  const hiddenLayers = useMemo(
    () => new Set((experience?.hiddenLayers ?? []) as StudioLayerId[]),
    [experience?.hiddenLayers]
  );
  const layerZ = useMemo(
    () => layerZIndexMap(experience?.layerOrder),
    [experience?.layerOrder]
  );
  const customScenes = useMemo(
    () =>
      (experience?.scenes ?? []).filter(
        (s) => s.tabId === "custom" && s.visible !== false && (s.body?.trim() || s.title)
      ),
    [experience?.scenes]
  );

  const calendarEvent = useMemo(
    () => ({
      title: displayEvent.title,
      startDateRaw: props.event.startDateRaw ?? props.event.startDate,
      venue: [displayEvent.venueName, displayEvent.landmark].filter(Boolean).join(" · ") || undefined,
      description: displayEvent.description ?? undefined,
    }),
    [displayEvent, props.event.startDateRaw, props.event.startDate]
  );

  const {
    primaryActions,
    runAction,
    loadingKey,
    actionError,
    shareState,
    share,
  } = useGuestPortalActions({
    invitationId: props.invitation.id,
    isEmbedded: props.embedded,
    showRsvp,
    mapsLink: props.event.mapsLink,
    venueName: displayEvent.venueName,
    landmark: displayEvent.landmark,
    contactPhone: props.event.contactPhone,
    contactEmail: props.contactEmail,
    seatLookupUrl: props.seatLookupUrl,
    seatingEnabled: props.seatingEnabled ?? Boolean(props.seatLookupUrl && props.seatQrDataUrl),
    hasQrPass: Boolean(props.qrDataUrl || props.admissionQrDataUrl || props.seatQrDataUrl),
    qrPassUrl: props.admissionQrToken ? `/admission/${props.admissionQrToken}` : null,
    galleryCount: props.galleryUrls?.length ?? 0,
    memoryVaultEnabled: props.memoryVaultEnabled || Boolean(props.memoryUploadUrl),
    memoryUploadUrl: props.memoryUploadUrl,
    memoryAlbumUrl: props.memoryAlbumUrl,
    menuUrl: props.menuUrl,
    menuBody: props.menuBody,
    registryUrl: props.registryUrl,
    eventId: props.eventId,
    calendarEvent,
    shareTitle: displayEvent.title,
    hubTabs,
    hasCalendarDate: Boolean(props.event.startDateRaw),
    buttonActions: experience?.buttonActions,
  });

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
    admissionManualCode: props.admissionManualCode,
    memoryVaultEnabled: props.memoryVaultEnabled,
    eventId: props.eventId,
    seatLookupUrl: props.seatLookupUrl ?? undefined,
  };

  const useBlocks = props.blocks && props.blocks.length > 0;
  const hubMode = experience?.hubMode ?? "scroll";
  const countdownStyle = experience?.countdownStyle ?? "classic";
  const environmentId = experience?.environment ?? "none";
  const environmentIntensity = experience?.environmentIntensity ?? "medium";
  const journeyChapters = experience?.journeyChapters ?? DEFAULT_JOURNEY;
  const scheduleItems = experience?.scheduleItems;
  const displaySchedule = scheduleItems?.length ? scheduleItems : (hubTabs.includes("timeline") ? DEFAULT_SCHEDULE_SAMPLES : []);
  const thankYouMessage = experience?.thankYouMessage;
  const accent = props.design?.colors?.accent ?? "#0B8A83";
  const secondary = props.design?.colors?.secondary ?? "#D4A63A";
  const lifecyclePhase = resolveEventLifecycle(props.event.startDateRaw);
  const galleryCount = props.galleryUrls?.length ?? 0;

  function getGalleryEntranceClass(layout?: string) {
    return getMediaEntranceClass(getMediaEntranceForLayout(layout ?? props.design.layout ?? "classic-gold"));
  }

  // Studio 2.0 paged viewer — activates when the design carries a token theme
  // (Wave 1 templates). Checked before cinematic mode; legacy invites without
  // a theme are untouched.
  const pagedTheme = props.design?.theme;
  if (pagedTheme && (experience?.hubMode === "paged" || !experience?.hubMode || Boolean(props.design?.blueprintId))) {
    return (
      <InviteViewportShell mode={props.embedded ? "embedded" : "live"} scrollable={false}>
        <PagedInvitationViewer
          context={{
            invitation: displayInvitation,
            event: displayEvent,
            design: props.design,
            theme: pagedTheme,
            category: categoryForBlueprint(props.design?.blueprintId),
            guestId: props.guestId,
            guestName: props.guestName,
            templateSlug: props.templateSlug,
            rsvpRequired: props.rsvpRequired,
            previewMode: isPreviewInvitationId(props.invitation.id),
          }}
        />
      </InviteViewportShell>
    );
  }

  const isTraditionalMarriage = props.design.layout === "traditional-marriage-ceremony";

  const cinematicMode =
    props.cinematicMode !== false &&
    props.fullScreen !== false &&
    !useBlocks &&
    !isTraditionalMarriage;

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
        admissionManualCode={props.admissionManualCode}
        guestQrToken={props.guestQrToken}
        seatLookupUrl={props.seatLookupUrl}
        seatQrDataUrl={props.seatQrDataUrl}
        experienceConfig={experience}
        portalActions={primaryActions}
        onPortalAction={runAction}
        portalActionLoadingKey={loadingKey}
        portalActionError={actionError}
        onShare={share}
        shareCopied={shareState === "copied"}
      />
    );
  }

  return (
    <InviteViewportShell
      mode={props.embedded ? "embedded" : "live"}
      scrollable
      className="bg-[#FAF8F4] relative overflow-x-hidden"
      style={{
        backgroundColor:
          props.design?.colors?.background?.startsWith("linear") ||
          props.design?.colors?.background?.startsWith("radial")
            ? undefined
            : (props.design?.colors?.background ?? "#FAF8F4"),
        ...(props.design?.studio?.headingSize
          ? { ["--inv-heading-size" as string]: `${props.design.studio.headingSize}px` }
          : {}),
        ...(props.design?.studio?.bodySize
          ? { ["--inv-body-size" as string]: `${props.design.studio.bodySize}px` }
          : {}),
        ...(props.design?.studio?.scriptSize
          ? { ["--inv-script-size" as string]: `${props.design.studio.scriptSize}px` }
          : {}),
      }}
    >
      {!hiddenLayers.has("environment") && (
        <div className="pointer-events-none fixed inset-0" style={{ zIndex: layerZ.environment }}>
          <ParticleEnvironment presetId={environmentId} intensity={environmentIntensity} />
        </div>
      )}
      {!hiddenLayers.has("background") && !props.backgroundVideoUrl && !props.backgroundImageUrl && (
        <div
          className="pointer-events-none fixed inset-0 opacity-90"
          style={{ zIndex: layerZ.background }}
        >
          <ExperienceBackgroundLayer
            packId={experience?.backgroundPackId}
            fallbackColor={props.design?.colors?.background ?? "#FAF8F4"}
            className="fixed inset-0"
          />
        </div>
      )}
      {!isTraditionalMarriage &&
        !hiddenLayers.has("background") &&
        (props.backgroundVideoUrl || props.backgroundImageUrl) && (
        <div
          className="fixed inset-0 overflow-hidden pointer-events-none"
          style={{ zIndex: layerZ.background }}
        >
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
          admissionManualCode={props.admissionManualCode}
          admissionQrDataUrl={props.admissionQrDataUrl}
          seatTable={props.seatTable}
          seatLabel={props.seatLabel}
          memoryUploadUrl={props.memoryUploadUrl}
          memoryAlbumUrl={props.memoryAlbumUrl}
          memoryUploadQrImageUrl={props.memoryUploadQrImageUrl}
          interactiveMedia
        />

        {!useBlocks && !hiddenLayers.has("actions") && primaryActions.length > 0 && (
          <div
            className="mx-auto max-w-2xl px-4 -mt-1 mb-1"
            style={{ position: "relative", zIndex: layerZ.actions }}
          >
            <div className="rounded-2xl border border-slate-200/50 bg-white/85 backdrop-blur-sm px-2 py-2.5 shadow-sm">
              <InvitationFeatureDock
                actions={primaryActions}
                accentColor={accent}
                loadingKey={loadingKey}
                onRun={runAction}
                error={actionError}
                compact={props.embedded}
              />
            </div>
          </div>
        )}

        <div className="mx-auto max-w-2xl px-4 py-6 invite-content-pad space-y-8">
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

          {/* Vision-board invite already shows guest name + full card copy — skip duplicate portal chrome */}
          {!isTraditionalMarriage && (
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
                <p className="text-slate-700 text-sm">Hosted by {displayEvent.hostName}</p>
              </div>
            </PortalSection>
          )}

          {!isTraditionalMarriage && !useBlocks && props.event.startDateRaw && (
            <PortalSection delay={75} id="save-date">
              <SaveDateCalendarCard
                accentColor={accent}
                secondaryColor={secondary}
                layout={props.design.layout}
                collectionId={experience?.collectionId}
                event={{
                  title: displayEvent.title,
                  startDateRaw: props.event.startDateRaw,
                  venue: [displayEvent.venueName, displayEvent.landmark].filter(Boolean).join(" · ") || undefined,
                  description: displayEvent.description ?? undefined,
                }}
              />
            </PortalSection>
          )}

          {!isTraditionalMarriage && hubMode === "storybook" ? (
            <StorybookJourney chapters={experience?.journeyChapters ?? STORYBOOK_JOURNEY} accentColor={accent} />
          ) : !isTraditionalMarriage && hubMode === "journey" ? (
            <JourneyFlow chapters={journeyChapters}>
              {(chapter) => (
                <div className="rounded-2xl border bg-white/90 p-6 text-center">
                  <p className="text-sm text-slate-600 mb-2">{chapter.title}</p>
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
              {hubTabs.includes("countdown") && !hiddenLayers.has("countdown") && (
              <PortalSection delay={100} id="countdown">
                <Countdown
                  target={props.event.startDateRaw ?? props.event.startDate}
                  label={t("invite.countdown")}
                  begunLabel={t("invite.celebration_begun")}
                  style={countdownStyle}
                />
              </PortalSection>
              )}

              {hubTabs.includes("timeline") && displaySchedule.length > 0 && (
              <PortalSection delay={120} id="schedule">
                <EventScheduleSection items={displaySchedule} accentColor={accent} />
              </PortalSection>
              )}

              {hubTabs.includes("story") && displayEvent.description && !isTraditionalMarriage && (
                <PortalSection delay={150} id="story">
                  <div className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur p-6 shadow-sm">
                    <h2 className="font-display text-lg font-bold text-[#0F172A]">{t("invite.our_story")}</h2>
                    <p className="mt-3 text-slate-600 leading-relaxed whitespace-pre-line">{displayEvent.description}</p>
                  </div>
                </PortalSection>
              )}

              {customScenes.map((scene, idx) => (
                <PortalSection key={scene.id} delay={160 + idx * 10} id={`custom-${scene.id}`}>
                  <div className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur p-6 shadow-sm">
                    <h2 className="font-display text-lg font-bold text-[#0F172A]">{scene.title}</h2>
                    {scene.body?.trim() && (
                      <p className="mt-3 text-slate-600 leading-relaxed whitespace-pre-line">{scene.body}</p>
                    )}
                  </div>
                </PortalSection>
              ))}

              {!isTraditionalMarriage && (
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
                </div>
              </PortalSection>
              )}

              {hubTabs.includes("venue") && (props.event.mapsLink || displayEvent.venueName) && (
                <PortalSection delay={210} id="venue-map">
                  <VenueMapEmbed
                    mapsLink={props.event.mapsLink}
                    venueName={displayEvent.venueName}
                    landmark={displayEvent.landmark}
                    accentColor={accent}
                  />
                </PortalSection>
              )}

              {(props.menuUrl || props.menuBody) && hubTabs.includes("menu") && (
                <PortalSection delay={225} id="menu">
                  <div className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur p-6 shadow-sm">
                    <h2 className="font-display text-lg font-bold text-[#0F172A] mb-3">Event Menu & Program</h2>
                    {props.menuBody && (
                      <p className="text-sm text-slate-600 whitespace-pre-line mb-4">{props.menuBody}</p>
                    )}
                    {props.menuUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={props.menuUrl} target="_blank" rel="noopener noreferrer">View full menu</a>
                      </Button>
                    )}
                  </div>
                </PortalSection>
              )}

              {hubTabs.includes("gallery") && props.galleryUrls && props.galleryUrls.length > 0 && (
                <PortalSection delay={250} id="gallery">
                  <div className="rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur p-6 shadow-sm inv-text-on-light">
                    <h2
                      className="font-display text-lg font-bold flex items-center gap-2 mb-4"
                      style={{ color: accent }}
                    >
                      <Images className="h-5 w-5" /> Gallery
                    </h2>
                    <InvitationGalleryDisplay
                      items={galleryItemsFromUrls(props.galleryUrls)}
                      interactive={props.galleryInteractive ?? !props.embedded}
                      settings={{
                        style: mapExperienceSlideshowStyle(experience?.slideshowStyle) as SlideshowStyleId,
                        slideDurationSec: 4,
                        autoplay: props.galleryInteractive ? false : Boolean(props.embedded),
                        showCaptions: false,
                        transition: "fade",
                      }}
                      className={getGalleryEntranceClass(props.design.layout)}
                    />
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

          {(props.event.contactPhone || props.contactEmail) && (
            <PortalSection delay={350} id="contact">
              <div className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur p-6 text-center shadow-sm">
                <h2 className="font-display text-lg font-bold text-[#0F172A] mb-3">Contact Organizer</h2>
                <div className="flex flex-wrap justify-center gap-3">
                  {props.event.contactPhone && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`tel:${props.event.contactPhone}`}><Phone className="h-4 w-4" /> Call</a>
                    </Button>
                  )}
                  {props.event.contactPhone && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={buildWhatsAppUrl(props.event.contactPhone, `Hi! I received your invitation for ${displayEvent.title}.`)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </a>
                    </Button>
                  )}
                  {props.contactEmail && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={buildEmailUrl(props.contactEmail, `Regarding: ${displayEvent.title}`)}>
                        <Mail className="h-4 w-4" /> Email
                      </a>
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
                {hubTabs.includes("seating") && props.seatQrDataUrl && props.seatLookupUrl && (
                  <div className="mb-6 rounded-xl bg-[#0B8A83]/5 border border-[#0B8A83]/20 p-4">
                    <p className="text-xs text-slate-600 mb-2 flex items-center justify-center gap-1">
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
                    <p className="text-xs text-slate-600 mb-3">Admission pass — show at the gate</p>
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
                    {props.admissionManualCode && (
                      <ManualGateCodeReveal code={props.admissionManualCode} variant="pass" />
                    )}
                  </div>
                )}
                {props.qrDataUrl && (
                  <div>
                    <p className="text-xs text-slate-600 mb-3">Invitation QR</p>
                    <BrandedQrImage
                      src={props.qrDataUrl}
                      token={props.guestQrToken ?? undefined}
                      size={160}
                      showDownload={false}
                    />
                    {!props.admissionQrDataUrl && props.admissionManualCode && (
                      <ManualGateCodeReveal code={props.admissionManualCode} variant="pass" />
                    )}
                  </div>
                )}
              </div>
            </PortalSection>
          )}

          <PortalSection delay={415} id="wishes">
            <GuestWishesCard
              eventId={props.eventId}
              invitationId={props.invitation.id}
              guestId={props.guestId}
              guestName={props.guestName}
              inviteLink={props.invitation.uniqueLink}
              accentColor={accent}
              memoryVaultEnabled={props.memoryVaultEnabled}
            />
          </PortalSection>

          {hubTabs.includes("gifts") && (
          <PortalSection delay={420} id="gifts">
            <GiftQrBox
              qrDataUrl={props.qrDataUrl}
              qrToken={props.guestQrToken}
              accentColor={secondary}
            />
            {!props.qrDataUrl && (
              <div className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur p-6 text-center shadow-sm mt-4">
                <h2 className="font-display text-lg font-bold text-[#0F172A] mb-2">Gifts & Contributions</h2>
                <p className="text-sm text-slate-600">Your presence is the greatest gift. Contact the host for registry details.</p>
              </div>
            )}
          </PortalSection>
          )}

          {(hubTabs.includes("memory") || props.memoryUploadUrl || props.memoryVaultEnabled) && (
          <PortalSection delay={430} id="memory">
            <InvitationMemoryAlbumCard
              eventTitle={props.memoryAlbumTitle?.trim() || displayEvent.title}
              uploadUrl={props.memoryUploadUrl}
              albumUrl={props.memoryAlbumUrl}
              uploadQrImageUrl={props.memoryUploadQrImageUrl}
            />
          </PortalSection>
          )}

          {lifecyclePhase === "post-event" && (
            <PortalSection delay={435} id="post-event">
              <PostEventExperience
                eventTitle={displayEvent.title}
                memoryVaultEnabled={props.memoryVaultEnabled}
                memoryUploadUrl={props.memoryUploadUrl}
                memoryAlbumUrl={props.memoryAlbumUrl}
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

        </div>

        {!props.embedded && props.event.startDateRaw && hubTabs.includes("countdown") && !hiddenLayers.has("countdown") && (
          <FloatingCountdownPill
            targetIso={props.event.startDateRaw}
            label={t("invite.countdown")}
            begunLabel={t("invite.celebration_begun")}
          />
        )}
      </div>
    </InviteViewportShell>
  );
}
