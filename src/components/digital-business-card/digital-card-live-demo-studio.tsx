"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Nfc, RotateCcw } from "lucide-react";
import { CeleYouBrandMark } from "@/components/digital-business-card/celeyou-brand-mark";
import { cn } from "@/lib/utils";
import { DigitalCardFace } from "@/components/digital-business-card/digital-card-face";
import { DigitalCardAtmosphere } from "@/components/digital-business-card/digital-card-atmosphere";
import { DigitalCardThemePicker } from "@/components/digital-business-card/digital-card-theme-picker";
import {
  DIGITAL_CARD_THEMES,
  resolveDigitalCardTheme,
  type DigitalCardTheme,
  type DigitalCardThemeId,
} from "@/lib/digital-business-card/themes";
import {
  DEMO_CARD,
  DEMO_CARD_ACTIVATED_AT,
  DEMO_CARD_PAID_THROUGH,
  DEMO_CARD_SLUG,
  DEMO_CARD_VIEW_COUNT,
  demoCardGuestPath,
  demoCardHubPath,
} from "@/lib/digital-business-card/demo-card";
import { smartCardShortUrl } from "@/lib/digital-business-card/product";
import { CELECARD_BIO_MAX_CHARS, clipCeleCardBio, digitalCardQrImageSrc } from "@/lib/digital-business-card/types";
import {
  DIGITAL_CARD_SOCIAL_GROUPS,
  chatKindsMapForSocials,
  compactAlignedTags,
  compactChatLinkKindsFromForm,
  compactDigitalCardSocials,
  usesChatLinkKinds,
  collectCardEmails,
  collectCardPhones,
  collectCardWebsites,
  collectTaggedEmails,
  collectTaggedPhones,
  listDigitalCardReachItems,
  toDigitalCardSocialForm,
  toPayQrMap,
  type ChatLinkKind,
  type ContactKindTag,
  type DigitalCardSocialForm,
} from "@/lib/digital-business-card/socials";
import {
  compactMeetingDesk,
  defaultMeetingDesk,
  persistMeetingDesk,
  type CeleCardMeetingDesk,
} from "@/lib/digital-business-card/meetings";
import { DigitalCardReachGrid } from "@/components/digital-business-card/digital-card-reach-grid";
import { DigitalCardRepeatFields } from "@/components/digital-business-card/digital-card-repeat-fields";
import {
  DigitalCardPayFields,
  DigitalCardPayGroup,
  payQrListForBrand,
  writePayQrBrand,
} from "@/components/digital-business-card/digital-card-pay-fields";
import { DigitalCardReachCatalog } from "@/components/digital-business-card/digital-card-reach-catalog";
import {
  DigitalCardOtherFields,
  DigitalCardOtherReservation,
} from "@/components/digital-business-card/digital-card-other-fields";
import { DigitalCardMeetingDesk } from "@/components/digital-business-card/digital-card-meeting-desk";
import {
  DigitalCardMeetingDrop,
  meetingPreviewItems,
} from "@/components/digital-business-card/digital-card-meeting-drop";
import {
  DigitalCardLocationDrop,
  locationPreviewItems,
} from "@/components/digital-business-card/digital-card-location-drop";
import { DigitalCardBrandMark } from "@/components/digital-business-card/digital-card-brand-mark";
import { DigitalCardReachOrderEditor } from "@/components/digital-business-card/digital-card-reach-order";
import { DigitalCardPrivacyDesk } from "@/components/digital-business-card/digital-card-privacy-desk";
import { applyReachVisibilityPreview, type ReachVisibility } from "@/lib/digital-business-card/privacy-preview";
import { DigitalCardPortraitField } from "@/components/digital-business-card/digital-card-portrait-field";
import { DigitalCardCompanyLogoField } from "@/components/digital-business-card/digital-card-company-logo-field";
import { DigitalCardLiveTermRibbon } from "@/components/digital-business-card/digital-card-subscription-countdown";
import { celecardAccentOnStage, celecardTypeVoice } from "@/lib/digital-business-card/type-voice";
import {
  celecardPortraitFrame,
  resolveCeleCardPortraitFrame,
  type CeleCardPortraitFrame,
} from "@/lib/digital-business-card/portrait-frame";

const HOUSE_THEME_IDS: DigitalCardThemeId[] = [
  "gold-folio",
  "heritage-luxe",
  "ivory-signature",
  "saddle-atelier",
  "porcelain-house",
  "garden-maison",
  "ballroom-gold",
  "deco-gilded",
  "renaissance-foil",
  "lacquer-case",
];

type DeskState = {
  displayName: string;
  title: string;
  company: string;
  bio: string;
  emails: string[];
  emailTags: Array<ContactKindTag | "">;
  phones: string[];
  phoneTags: Array<ContactKindTag | "">;
  websites: string[];
  socials: DigitalCardSocialForm;
  themeId: DigitalCardThemeId;
  nfcEnabled: boolean;
  avatarUrl: string | null;
  stackOrder: string[];
  dockOrder: string[];
  payQr: Record<string, string>;
  linkKinds: Record<string, Array<ChatLinkKind | "">>;
  portraitFrame: CeleCardPortraitFrame;
  reachVisibility: Record<string, ReachVisibility>;
  companyLogoUrl: string | null;
  meeting: CeleCardMeetingDesk;
};

function publishedDesk(): DeskState {
  const emails = collectCardEmails(DEMO_CARD);
  const phones = collectCardPhones(DEMO_CARD);
  const websites = collectCardWebsites(DEMO_CARD);
  return {
    displayName: DEMO_CARD.displayName,
    title: DEMO_CARD.title ?? "",
    company: DEMO_CARD.company ?? "",
    bio: DEMO_CARD.bio ?? "",
    emails: emails.length ? emails : [""],
    emailTags: emails.length ? collectTaggedEmails(DEMO_CARD).map((item) => item.tag ?? "") : [""],
    phones: phones.length ? phones : [""],
    phoneTags: phones.length ? collectTaggedPhones(DEMO_CARD).map((item) => item.tag ?? "") : [""],
    websites: websites.length ? websites : [""],
    socials: toDigitalCardSocialForm(DEMO_CARD.socials),
    themeId: DEMO_CARD.themeId as DigitalCardThemeId,
    nfcEnabled: DEMO_CARD.nfcEnabled,
    avatarUrl: DEMO_CARD.avatarUrl,
    stackOrder: DEMO_CARD.socials.stackOrder ?? [],
    dockOrder: DEMO_CARD.socials.dockOrder ?? [],
    payQr: toPayQrMap(DEMO_CARD.socials),
    linkKinds: chatKindsMapForSocials(DEMO_CARD.socials),
    portraitFrame: resolveCeleCardPortraitFrame(
      resolveDigitalCardTheme(DEMO_CARD.themeId),
      DEMO_CARD.socials.portraitFrame
    ),
    reachVisibility: {},
    companyLogoUrl: DEMO_CARD.socials.companyLogoUrl ?? null,
    meeting: compactMeetingDesk(DEMO_CARD.socials.meeting) ?? defaultMeetingDesk({ enabled: true, timezone: "Africa/Accra", title: "Book a sitting", place: "Video", note: "I'll confirm the time and send a link." }),
  };
}

function hexLum(color: string) {
  const hex = color.replace("#", "");
  if (hex.length < 6) return 255;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function isDarkInk(color: string) {
  return hexLum(color) < 148;
}

function stageInk(stageBackground: string) {
  const match = stageBackground.match(/#([0-9a-fA-F]{6})/);
  const dark = (match ? hexLum(`#${match[1]}`) : 40) < 148;
  return {
    dark,
    fg: dark ? "#faf6ef" : "#1c1917",
    muted: dark ? "rgba(250,246,239,0.90)" : "rgba(28,25,23,0.82)",
    faint: dark ? "rgba(250,246,239,0.12)" : "rgba(28,25,23,0.08)",
  };
}

function FolioField({
  label,
  theme,
  children,
  wide,
  mark,
  action,
}: {
  label: string;
  theme: DigitalCardTheme;
  children: ReactNode;
  wide?: boolean;
  mark?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={cn("block", wide ? "sm:col-span-2" : "")}>
      <span className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2">
          {mark ? <span className="inline-flex shrink-0">{mark}</span> : null}
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: celecardAccentOnStage(theme.accent, stageInk(theme.stageBackground).dark) }}
          >
            {label}
          </span>
        </span>
        {action}
      </span>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function folioControlStyle(theme: DigitalCardTheme): CSSProperties {
  const darkCard = !isDarkInk(theme.text);
  const voice = celecardTypeVoice(theme);
  return {
    borderColor: theme.border,
    background: darkCard ? "rgba(12, 28, 27, 0.88)" : "rgba(255,255,255,0.96)",
    color: darkCard ? "#faf6ef" : "#1c1917",
    fontFamily: voice.meta,
    colorScheme: darkCard ? "dark" : "light",
  };
}

export function DigitalCardLiveDemoStudio({
  origin,
  cardholder = false,
}: {
  origin: string;
  cardholder?: boolean;
}) {
  const [desk, setDesk] = useState<DeskState>(publishedDesk);
  const [browseAll, setBrowseAll] = useState(false);
  const [wideStage, setWideStage] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setWideStage(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const qrUrl = smartCardShortUrl(DEMO_CARD.publicToken, origin);
  const qrSrc = qrUrl ? digitalCardQrImageSrc(qrUrl) : null;
  const theme = resolveDigitalCardTheme(desk.themeId);
  const typeVoice = celecardTypeVoice(theme);
  const stage = stageInk(theme.stageBackground);
  const houseThemes = useMemo(
    () => HOUSE_THEME_IDS.map((id) => DIGITAL_CARD_THEMES.find((t) => t.id === id)).filter(Boolean) as DigitalCardTheme[],
    []
  );
  const reach = useMemo(
    () =>
      listDigitalCardReachItems({
        email: desk.emails[0] || null,
        phone: desk.phones[0] || null,
        website: desk.websites[0] || null,
        socials: {
          ...compactDigitalCardSocials(
            {
              ...desk.socials,
              website: desk.websites,
            },
            desk.payQr
          ),
          emails: desk.emails.map((value) => value.trim()).filter(Boolean),
          emailTags: compactAlignedTags(desk.emails, desk.emailTags),
          phones: desk.phones.map((value) => value.trim()).filter(Boolean),
          phoneTags: compactAlignedTags(desk.phones, desk.phoneTags),
          linkKinds: compactChatLinkKindsFromForm(desk.socials, desk.linkKinds),
          stackOrder: desk.stackOrder,
          dockOrder: desk.dockOrder,
          meeting: persistMeetingDesk(desk.meeting),
        },
      }),
    [desk]
  );
  const guestReach = useMemo(
    () => applyReachVisibilityPreview(reach, desk.reachVisibility ?? {}),
    [reach, desk.reachVisibility]
  );

  function patch(partial: Partial<DeskState>) {
    const next = partial.bio !== undefined ? { ...partial, bio: clipCeleCardBio(partial.bio) } : partial;
    setDesk((prev) => ({ ...prev, ...next }));
  }

  function resetDesk() {
    if (desk.avatarUrl?.startsWith("blob:")) URL.revokeObjectURL(desk.avatarUrl);
    if (desk.companyLogoUrl?.startsWith("blob:")) URL.revokeObjectURL(desk.companyLogoUrl);
    setDesk(publishedDesk());
  }

  const dirty =
    desk.displayName !== DEMO_CARD.displayName ||
    desk.themeId !== DEMO_CARD.themeId ||
    desk.title !== (DEMO_CARD.title ?? "") ||
    desk.company !== (DEMO_CARD.company ?? "") ||
    desk.bio !== (DEMO_CARD.bio ?? "") ||
    desk.avatarUrl !== DEMO_CARD.avatarUrl ||
    desk.emails.join("|") !== collectCardEmails(DEMO_CARD).join("|") ||
    desk.phones.join("|") !== collectCardPhones(DEMO_CARD).join("|");

  return (
    <section className="relative min-h-app-viewport overflow-hidden" style={{ background: theme.stageBackground }}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.28]" aria-hidden>
        <DigitalCardAtmosphere atmosphere={theme.atmosphere ?? "none"} theme={theme} />
      </div>
      {theme.textureUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={theme.textureUrl}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.14] mix-blend-luminosity"
        />
      ) : null}

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={demoCardHubPath()}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition hover:opacity-90"
            style={{ color: stage.fg, background: stage.faint, border: `1px solid ${theme.border}` }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dummy hub
          </Link>
          <p
            className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: theme.accent, background: stage.faint, border: `1px solid ${theme.border}` }}
          >
            Dummy desk. Edits stay on this screen.
          </p>
        </div>

        <header className="mb-8 max-w-2xl">
          <CeleYouBrandMark
            variant="chip"
            tone="dark"
            className="mb-3 border-white/15 bg-black/20"
            markClassName="h-12 w-12"
          />
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: theme.accent, fontFamily: typeVoice.origin }}
          >
            {theme.artLabel || theme.previewLabel} · live dummy
          </p>
          <h1
            className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl"
            style={{
              color: stage.fg,
              fontFamily: typeVoice.heading,
              letterSpacing: typeVoice.nameTracking,
            }}
          >
            {desk.displayName || "Your name"}
          </h1>
          <label className="mt-5 block max-w-xl">
            <span className="sr-only">About</span>
            <textarea
              value={desk.bio}
              onChange={(e) => patch({ bio: e.target.value })}
              rows={4}
              maxLength={CELECARD_BIO_MAX_CHARS}
              placeholder="A few words guests read under your name."
              className="celecard-live-bio w-full resize-y bg-transparent py-1 text-[1.2rem] font-semibold leading-[1.45] outline-none placeholder:opacity-40 sm:text-[1.45rem] sm:leading-[1.4]"
              style={{
                color: stage.fg,
                fontFamily: typeVoice.title,
                fontStyle: typeVoice.titleItalic ? "italic" : "normal",
                letterSpacing: typeVoice.titleTracking,
                caretColor: theme.accent,
                textShadow: stage.dark ? "0 1px 0 rgba(0,0,0,0.35)" : "0 1px 0 rgba(255,255,255,0.65)",
              }}
            />
          </label>
        </header>

        <DigitalCardLiveTermRibbon
          themeName={theme.name}
          planLabel="Yearly"
          endsAt={DEMO_CARD_PAID_THROUGH}
          startsAt={DEMO_CARD_ACTIVATED_AT}
          status="ACTIVE"
          viewCount={DEMO_CARD_VIEW_COUNT}
          nfcEnabled={desk.nfcEnabled}
          qrLive
          accent={theme.accent}
          border={theme.border}
          fg={stage.fg}
          muted={stage.muted}
          faint={stage.faint}
        />

        <div className="grid grid-cols-1 items-start gap-8 min-[1180px]:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="min-w-0 lg:sticky lg:top-24">
            <div
              className="relative min-w-0 overflow-hidden rounded-[1.75rem] p-4 sm:p-7"
              style={{
                background: theme.cardBackground,
                border: `1px solid ${theme.border}`,
                boxShadow: "0 28px 80px rgba(0,0,0,0.28)",
              }}
            >
              <span className="pointer-events-none absolute left-4 top-4 h-6 w-6 border-l border-t" style={{ borderColor: theme.accent }} />
              <span className="pointer-events-none absolute right-4 top-4 h-6 w-6 border-r border-t" style={{ borderColor: theme.accent }} />
              <span className="pointer-events-none absolute bottom-4 left-4 h-6 w-6 border-b border-l" style={{ borderColor: theme.accent }} />
              <span className="pointer-events-none absolute bottom-4 right-4 h-6 w-6 border-b border-r" style={{ borderColor: theme.accent }} />

              {cardholder ? (
                <p
                  className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: theme.accent, fontFamily: typeVoice.origin }}
                >
                  Dummy look. Your CeleYou keeps its own QR, link, and NFC token.
                </p>
              ) : null}
              <div className="mx-auto w-full max-w-full">
                <DigitalCardFace
                  themeId={theme.id}
                  displayName={desk.displayName || "Your name"}
                  title={desk.title || "Your title"}
                  company={desk.company || "Your company"}
                  avatarUrl={desk.avatarUrl}
                  qrSrc={qrSrc}
                  qrHref={demoCardGuestPath()}
                  compact={!wideStage}
                  className="mx-auto w-full max-w-full"
                  portraitFrame={desk.portraitFrame}
                  companyLogo
                  companyLogoUrl={desk.companyLogoUrl}
                />
              </div>
              {desk.bio ? (
                <p
                  className="mx-auto mt-5 max-w-xl text-center text-sm leading-relaxed"
                  style={{ color: theme.text, fontFamily: typeVoice.meta, opacity: 0.86 }}
                >
                  {desk.bio}
                </p>
              ) : null}
              {guestReach.length ? (
                <div className="mt-4">
                  <DigitalCardReachGrid
                    items={guestReach}
                    theme={theme}
                    compact
                    slug={DEMO_CARD_SLUG}
                    ownerName={desk.displayName}
                  />
                </div>
              ) : null}
              <p className="mt-4 text-center text-[11px]" style={{ color: stage.muted }}>
                Tap the card to open the live page.
              </p>
            </div>
          </div>

          <div
            className="min-w-0 rounded-[1.75rem] p-5 sm:p-6"
            style={{
              background: theme.cardBackground,
              border: `1px solid ${theme.border}`,
              color: theme.text,
              boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
            }}
          >
            <div className="mb-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.accent }}>
                  Your details
                </p>
                <h2 className="mt-1 text-xl font-semibold" style={{ fontFamily: typeVoice.heading }}>
                  Identity on the card
                </h2>
              </div>
              <button
                type="button"
                onClick={resetDesk}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]"
                style={{
                  color: dirty ? celecardAccentOnStage(theme.accent, stage.dark) : stage.muted,
                  border: `1px solid ${theme.border}`,
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Ama
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FolioField label="Portrait" theme={theme} wide>
                <DigitalCardPortraitField
                  value={desk.avatarUrl}
                  onChange={(url) => patch({ avatarUrl: url })}
                  theme={theme}
                  displayName={desk.displayName}
                  mode="local"
                  compact
                  portraitFrame={desk.portraitFrame}
                  onPortraitFrameChange={(portraitFrame) => patch({ portraitFrame })}
                />
                <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: stage.muted }}>
                  Circle or square sits on this preview. Guests who tap Ama still see her published portrait until you publish.
                </p>
              </FolioField>
              <FolioField label="Full name" theme={theme}>
                <input
                  value={desk.displayName}
                  onChange={(e) => patch({ displayName: e.target.value })}
                  className={folioInputClass}
                  style={folioControlStyle(theme)}
                />
              </FolioField>
              <FolioField label="Title" theme={theme}>
                <input
                  value={desk.title}
                  onChange={(e) => patch({ title: e.target.value })}
                  className={folioInputClass}
                  style={folioControlStyle(theme)}
                />
              </FolioField>
              <FolioField label="Company" theme={theme}>
                <div className="flex items-start gap-3">
                  <DigitalCardCompanyLogoField
                    value={desk.companyLogoUrl}
                    onChange={(url) => patch({ companyLogoUrl: url })}
                    company={desk.company}
                    theme={theme}
                    mode="local"
                    compact
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <input
                      value={desk.company}
                      onChange={(e) => patch({ company: e.target.value })}
                      className={folioInputClass}
                      style={folioControlStyle(theme)}
                      placeholder="Your company, studio, or business"
                    />
                    <p className="text-[11px] leading-relaxed" style={{ color: stage.muted }}>
                      The business guests should remember. Upload a square mark beside the name.
                    </p>
                  </div>
                </div>
              </FolioField>
              <FolioField
                label="About"
                theme={theme}
                wide
                action={
                  <span className="text-[11px] tabular-nums" style={{ color: stage.muted }}>
                    {desk.bio.length}/{CELECARD_BIO_MAX_CHARS}
                  </span>
                }
              >
                <textarea
                  value={desk.bio}
                  onChange={(e) => patch({ bio: e.target.value })}
                  rows={4}
                  maxLength={CELECARD_BIO_MAX_CHARS}
                  className={cn(folioInputClass, "min-h-[5.5rem] py-2.5")}
                  style={folioControlStyle(theme)}
                />
              </FolioField>
              <FolioField
                label="Email"
                theme={theme}
                wide
                mark={<DigitalCardBrandMark id="email" className="h-7 w-7 rounded-[9px]" />}
              >
                <DigitalCardRepeatFields
                  brand="email"
                  values={desk.emails}
                  tags={desk.emailTags}
                  onTaggedChange={({ values, tags }) => patch({ emails: values, emailTags: tags })}
                  type="email"
                  addLabel="Add another email"
                  inputClassName={folioInputClass}
                  inputStyle={folioControlStyle(theme)}
                  addStyle={{ color: theme.accent }}
                  showKindTags
                  tagAccent={theme.accent}
                  tagInk="#fffef8"
                />
              </FolioField>
              <FolioField
                label="Phone"
                theme={theme}
                wide
                mark={<DigitalCardBrandMark id="phone" className="h-7 w-7 rounded-[9px]" />}
              >
                <DigitalCardRepeatFields
                  brand="phone"
                  values={desk.phones}
                  tags={desk.phoneTags}
                  onTaggedChange={({ values, tags }) => patch({ phones: values, phoneTags: tags })}
                  type="tel"
                  addLabel="Add another number"
                  inputClassName={folioInputClass}
                  inputStyle={folioControlStyle(theme)}
                  addStyle={{ color: theme.accent }}
                  showKindTags
                  tagAccent={theme.accent}
                  tagInk="#fffef8"
                />
              </FolioField>
              <FolioField
                label="Website"
                theme={theme}
                mark={<DigitalCardBrandMark id="website" className="h-7 w-7 rounded-[9px]" />}
              >
                <DigitalCardRepeatFields
                  brand="website"
                  values={desk.websites}
                  onChange={(websites) => patch({ websites })}
                  placeholder="www. or http://"
                  addLabel="Add another site"
                  inputClassName={folioInputClass}
                  inputStyle={folioControlStyle(theme)}
                  addStyle={{ color: theme.accent }}
                />
              </FolioField>
              <FolioField
                label="Location"
                theme={theme}
                wide
                mark={<DigitalCardBrandMark id="location" className="h-7 w-7 rounded-[9px]" />}
              >
                <DigitalCardRepeatFields
                  brand="location"
                  values={desk.socials.location}
                  onChange={(location) => patch({ socials: { ...desk.socials, location } })}
                  placeholder="Google Maps, Amap, or a street address"
                  addLabel="Add another place"
                  inputClassName={folioInputClass}
                  inputStyle={folioControlStyle(theme)}
                  addStyle={{ color: theme.accent }}
                />
                {locationPreviewItems(desk.socials.location).length ? (
                  <div className="mt-2">
                    <DigitalCardLocationDrop
                      items={locationPreviewItems(desk.socials.location)}
                      theme={theme}
                      compact
                      preview
                    />
                  </div>
                ) : null}
              </FolioField>
              <FolioField
                label="Meetings"
                theme={theme}
                wide
                mark={<DigitalCardBrandMark id="meeting" className="h-7 w-7 rounded-[9px]" />}
              >
                <DigitalCardMeetingDesk
                  value={desk.meeting}
                  onChange={(meeting) => patch({ meeting })}
                  accent={theme.accent}
                  inputClassName={folioInputClass}
                  inputStyle={folioControlStyle(theme)}
                />
                {meetingPreviewItems(desk.meeting).length ? (
                  <div className="mt-2 overflow-hidden rounded-2xl border" style={{ borderColor: theme.border }}>
                    <DigitalCardMeetingDrop
                      items={meetingPreviewItems(desk.meeting)}
                      theme={theme}
                      compact
                      preview
                      ownerName={desk.displayName}
                    />
                  </div>
                ) : null}
              </FolioField>
            </div>

            <div className="mt-6 border-t pt-5" style={{ borderColor: theme.border }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.accent }}>
                Reach
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: stage.muted }}>
                Search or flip through a network. Tap one to add it, then fill that field. If the app is not listed, save it as another page guests can open.
              </p>
              {DIGITAL_CARD_SOCIAL_GROUPS.map((group) => (
                <div key={group.id} className="mt-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.accent }}>
                    {group.label}
                  </p>
                  {group.id === "pay" ? (
                    <DigitalCardPayGroup
                      socials={desk.socials}
                      payQr={desk.payQr}
                      accent={theme.accent}
                      intro={
                        <p className="mb-3 text-xs leading-relaxed" style={{ color: stage.muted }}>
                          Official wallet marks. Guests only see the wallets you fill. Number, cashtag, payment link, bank account, or a receive QR.
                        </p>
                      }
                      onAdd={(key) => {
                        const current = desk.socials[key as keyof typeof desk.socials];
                        patch({
                          socials: { ...desk.socials, [key]: current?.length ? current : [""] },
                        });
                      }}
                      onRemove={(key) =>
                        patch({
                          socials: { ...desk.socials, [key]: [] },
                          payQr: writePayQrBrand(desk.payQr, key, []),
                        })
                      }
                    >
                      {(network) => (
                        <FolioField
                          key={network.key}
                          label={network.label}
                          theme={theme}
                          mark={<DigitalCardBrandMark id={network.key} className="h-10 w-10 rounded-[12px]" />}
                        >
                          <DigitalCardPayFields
                            brand={network.key}
                            values={desk.socials[network.key] ?? []}
                            qrUrls={payQrListForBrand(desk.payQr, network.key, desk.socials[network.key])}
                            onChange={(next, qrUrls) =>
                              patch({
                                socials: { ...desk.socials, [network.key]: next },
                                payQr: writePayQrBrand(desk.payQr, network.key, qrUrls),
                              })
                            }
                            onRemoveWallet={() =>
                              patch({
                                socials: { ...desk.socials, [network.key]: [] },
                                payQr: writePayQrBrand(desk.payQr, network.key, []),
                              })
                            }
                            placeholder={network.placeholder}
                            addLabel={`Add another ${network.label}`}
                            inputClassName={folioInputClass}
                            inputStyle={folioControlStyle(theme)}
                            addStyle={{ color: theme.accent }}
                          />
                        </FolioField>
                      )}
                    </DigitalCardPayGroup>
                  ) : (
                  <DigitalCardReachCatalog
                    groupId={group.id}
                    socials={desk.socials}
                    payQr={desk.payQr}
                    accent={theme.accent}
                    searchClassName={folioInputClass}
                    searchStyle={folioControlStyle(theme)}
                    intro={
                      group.id === "chat" ? (
                        <p className="mb-3 text-xs leading-relaxed" style={{ color: stage.muted }}>
                          Number, username, group, or channel. Tagged so guests can choose.
                        </p>
                      ) : group.id === "social" ? (
                        <p className="mb-3 text-xs leading-relaxed" style={{ color: stage.muted }}>
                          Profiles, posts, and any page that is not in the list. Other links stay reserved at the bottom.
                        </p>
                      ) : null
                    }
                    onAdd={(key, seed) => {
                      const current = desk.socials[key as keyof typeof desk.socials] ?? [];
                      const filled = current.filter((value) => value.trim());
                      const next = filled.length ? (seed ? [...filled, seed] : current) : [seed ?? ""];
                      patch({
                        socials: { ...desk.socials, [key]: next },
                      });
                    }}
                    onRemove={(key) =>
                      patch({
                        socials: { ...desk.socials, [key]: [] },
                        payQr: writePayQrBrand(desk.payQr, key, []),
                        linkKinds: { ...desk.linkKinds, [key]: [] },
                      })
                    }
                  >
                    {(network) => (
                      <FolioField
                        label={network.label}
                        theme={theme}
                        mark={<DigitalCardBrandMark id={network.key} className="h-7 w-7 rounded-[9px]" />}
                      >
                        {network.key === "other" ? (
                          <DigitalCardOtherFields
                            values={desk.socials[network.key] ?? []}
                            onChange={(next) => patch({ socials: { ...desk.socials, [network.key]: next } })}
                            inputClassName={folioInputClass}
                            inputStyle={folioControlStyle(theme)}
                            addStyle={{ color: theme.accent }}
                          />
                        ) : (
                          <DigitalCardRepeatFields
                            brand={network.key}
                            values={desk.socials[network.key] ?? []}
                            onChange={(next) => patch({ socials: { ...desk.socials, [network.key]: next } })}
                            showChatKinds={usesChatLinkKinds(network.key)}
                            chatKinds={desk.linkKinds[network.key]}
                            onChatKindsChange={(kinds) =>
                              patch({ linkKinds: { ...desk.linkKinds, [network.key]: kinds } })
                            }
                            qrUrls={payQrListForBrand(desk.payQr, network.key, desk.socials[network.key])}
                            onQrUrlsChange={(qrUrls) =>
                              patch({ payQr: writePayQrBrand(desk.payQr, network.key, qrUrls) })
                            }
                            tagAccent={theme.accent}
                            tagInk="#fffef8"
                            placeholder={network.placeholder}
                            addLabel={`Add another ${network.label}`}
                            inputClassName={folioInputClass}
                            inputStyle={folioControlStyle(theme)}
                            addStyle={{ color: theme.accent }}
                          />
                        )}
                      </FolioField>
                    )}
                  </DigitalCardReachCatalog>
                  )}
                </div>
              ))}
              <div className="mt-4">
                <DigitalCardOtherReservation
                  values={desk.socials.other ?? []}
                  onChange={(next) => patch({ socials: { ...desk.socials, other: next } })}
                  accent={theme.accent}
                  inputClassName={folioInputClass}
                  inputStyle={folioControlStyle(theme)}
                />
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-white/94 p-4" style={{ border: `1px solid ${theme.border}` }}>
              <DigitalCardPrivacyDesk
                items={reach}
                visibility={desk.reachVisibility ?? {}}
                onVisibilityChange={(reachVisibility) => patch({ reachVisibility })}
              />
            </div>

            <div className="mt-6 rounded-2xl bg-white/94 p-4" style={{ border: `1px solid ${theme.border}` }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.accent }}>
                Guest page arrangement
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Reorder live taps. Empty fields never appear on the guest page.
              </p>
              <div className="mt-3">
                <DigitalCardReachOrderEditor
                  items={reach}
                  onChange={({ stackOrder, dockOrder }) => patch({ stackOrder, dockOrder })}
                />
              </div>
            </div>

            <div className="mt-6 border-t pt-5" style={{ borderColor: theme.border }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.accent }}>
                House art
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: stage.muted }}>
                {theme.name}. {theme.tagline}.
              </p>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {houseThemes.map((item) => {
                  const selected = item.id === theme.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        patch({ themeId: item.id, portraitFrame: celecardPortraitFrame(item) })
                      }
                      aria-pressed={selected}
                      className="relative h-20 w-[4.75rem] shrink-0 overflow-hidden rounded-xl border text-left transition"
                      style={{
                        background: item.stageBackground,
                        borderColor: selected ? item.accent : item.border,
                        boxShadow: selected ? `0 0 0 2px ${item.accent}` : undefined,
                      }}
                    >
                      <span className="pointer-events-none absolute inset-0 opacity-70">
                        <DigitalCardAtmosphere atmosphere={item.atmosphere ?? "none"} theme={item} compact />
                      </span>
                      <span
                        className="absolute inset-x-1 bottom-1 truncate text-[9px] font-semibold uppercase tracking-[0.1em]"
                        style={{ color: stageInk(item.stageBackground).fg }}
                      >
                        {item.previewLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setBrowseAll((v) => !v)}
                className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: theme.accent }}
              >
                {browseAll ? "Hide world art" : "Browse all world art"}
              </button>
              {browseAll ? (
                <div className="mt-3">
                  <DigitalCardThemePicker
                    value={theme.id}
                    onChange={(themeId) =>
                      patch({
                        themeId,
                        portraitFrame: celecardPortraitFrame(resolveDigitalCardTheme(themeId)),
                      })
                    }
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm" style={{ color: theme.text }}>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: "#16a34a" }} />
                Published
              </span>
              <label className="inline-flex flex-nowrap items-center gap-2 whitespace-nowrap">
                <input
                  id="nfc-ready"
                  type="checkbox"
                  checked={desk.nfcEnabled}
                  onChange={(e) => patch({ nfcEnabled: e.target.checked })}
                />
                <Nfc className="h-4 w-4" />
                NFC ready
              </label>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const folioInputClass =
  "h-11 w-full rounded-xl border px-3.5 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-offset-0";
