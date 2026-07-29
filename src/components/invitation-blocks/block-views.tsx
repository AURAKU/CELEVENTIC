"use client";

import { useState, useEffect, type CSSProperties } from "react";
import { Clock, Shirt, Phone, Mail, Gift, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvitationRsvpPanel } from "@/components/invitation/shared/invitation-rsvp-panel";
import { BlockShell } from "@/components/invitation-blocks/block-shell";
import type { InvitationBlockDto, BlockRenderContext } from "@/lib/invitation-blocks/block-types";
import { useLocale } from "@/components/i18n/locale-provider";
import { BrandedQrImage } from "@/components/qr/branded-qr-image";
import { ManualGateCodeReveal } from "@/components/qr/manual-gate-code-reveal";
import { InvitationGalleryDisplay, slideshowStyleFromVariant } from "@/components/invitation/invitation-gallery-display";
import { TraditionalMarriageGallerySection } from "@/components/invitation/templates/traditional-marriage-gallery";
import { TraditionalMarriageCountdown } from "@/components/invitation/templates/traditional-marriage-countdown";
import { TraditionalMarriageThankYou } from "@/components/invitation/templates/traditional-marriage-thank-you";
import { TM_PALETTE } from "@/components/invitation/templates/traditional-marriage-palette";
import { FA_PALETTE } from "@/components/invitation/templates/forever-afaris-wedding-palette";
import { VenueMapEmbed } from "@/components/guest-portal/venue-map-embed";
import { cn } from "@/lib/utils";

/**
 * Stationery chrome for wedding templates whose place card / ceremony art
 * already own the look. Blocks inherit linen, ink, and script fonts instead
 * of generic white/teal dashboard cards.
 */
interface HeritageChrome {
  surface: string;
  border: string;
  heading: string;
  eyebrow: string;
  rule: string;
  ink: string;
  muted: string;
  accent: string;
  radius: string;
}

function heritageChromeFor(layout?: string): HeritageChrome | null {
  if (layout === "traditional-marriage-ceremony") {
    return {
      surface: TM_PALETTE.peach,
      border: TM_PALETTE.border,
      heading: TM_PALETTE.bronze,
      eyebrow: TM_PALETTE.bronzeDeep,
      rule: `${TM_PALETTE.mustard}70`,
      ink: TM_PALETTE.ink,
      muted: TM_PALETTE.dress,
      accent: TM_PALETTE.bronzeDeep,
      radius: "0.5rem",
    };
  }
  if (layout === "forever-afaris-wedding") {
    return {
      surface: FA_PALETTE.linen,
      border: FA_PALETTE.border,
      heading: FA_PALETTE.goldDeep,
      eyebrow: FA_PALETTE.cocoa,
      rule: FA_PALETTE.goldSoft,
      ink: FA_PALETTE.ink,
      muted: FA_PALETTE.cocoa,
      accent: FA_PALETTE.gold,
      radius: "1.25rem",
    };
  }
  return null;
}

function heritageShellStyle(chrome: HeritageChrome): CSSProperties {
  return {
    background: chrome.surface,
    borderColor: chrome.border,
    borderRadius: chrome.radius,
    color: chrome.ink,
    boxShadow: "none",
  };
}

function BlockHeader({
  block,
  locale,
  editorial,
  chrome,
}: {
  block: InvitationBlockDto;
  locale: string;
  /** Traditional Marriage / heritage editorial header */
  editorial?: boolean;
  chrome?: HeritageChrome | null;
}) {
  const localized = block.contents?.find((c) => c.language === locale);
  const title = localized?.title ?? block.title;
  const subtitle = localized?.subtitle ?? block.subtitle;
  if (!title && !subtitle) return null;

  const heritage =
    chrome ?? (editorial ? heritageChromeFor("traditional-marriage-ceremony") : null);

  if (heritage) {
    return (
      <div className="mb-5 text-center space-y-2">
        {subtitle && (
          <p
            className="font-[family-name:var(--font-cormorant)] text-[11px] tracking-[0.36em] uppercase"
            style={{ color: heritage.eyebrow }}
          >
            {subtitle}
          </p>
        )}
        {title && (
          <h2
            className="font-[family-name:var(--font-great-vibes)] text-[2.35rem] sm:text-[2.65rem] leading-none"
            style={{ color: heritage.heading }}
          >
            {title}
          </h2>
        )}
        <div
          className="tm-hairline mx-auto mt-3 h-px w-14"
          style={{ backgroundColor: heritage.rule }}
          aria-hidden
        />
      </div>
    );
  }

  return (
    <div className="mb-5 text-center">
      {title && <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0F172A]">{title}</h2>}
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

function CountdownView({
  target,
  label,
  begun,
  chrome = "default",
}: {
  target?: string;
  label: string;
  begun: string;
  /** Traditional Marriage linen editorial, other templates keep classic navy */
  chrome?: "default" | "linen";
}) {
  const [left, setLeft] = useState("");

  useEffect(() => {
    if (!target || chrome === "linen") return;
    const targetDate = target;
    function tick() {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setLeft(begun);
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLeft(`${d}d ${h}h ${m}m`);
    }
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [target, begun, chrome]);

  if (!target) return null;

  if (chrome === "linen") {
    return (
      <TraditionalMarriageCountdown
        targetIso={target}
        label={label === "Countdown" || !label ? "Until we gather" : label}
        begunLabel={begun}
      />
    );
  }

  return (
    <div className="rounded-2xl bg-[#0F172A] text-white p-6 text-center inv-fade-in">
      <Clock className="h-6 w-6 mx-auto text-[#D4A63A] mb-2" />
      <p className="text-xs uppercase tracking-widest text-white/60">{label}</p>
      <p className="font-display text-2xl font-bold mt-2 inv-countdown-pulse">{left}</p>
    </div>
  );
}

interface BlockViewProps {
  block: InvitationBlockDto;
  ctx: BlockRenderContext;
}

export function BlockView({ block, ctx }: BlockViewProps) {
  const { locale, t } = useLocale();
  const localized = block.contents?.find((c) => c.language === locale);
  const body = localized?.content ?? block.contentJson?.body ?? "";
  const cj = { ...block.contentJson, ...(localized?.contentJson ?? {}) };
  const heritage = heritageChromeFor(ctx.layout);

  switch (block.blockType) {
    case "WELCOME":
      return (
        <BlockShell
          variant={block.styleVariant}
          style={heritage ? heritageShellStyle(heritage) : undefined}
        >
          <BlockHeader block={block} locale={locale} chrome={heritage} />
          <p
            className={cn(
              "text-center",
              heritage
                ? "font-[family-name:var(--font-cormorant)] text-[1.05rem] sm:text-lg leading-relaxed italic"
                : "text-lg text-[#0B8A83] font-medium"
            )}
            style={heritage ? { color: heritage.muted } : undefined}
          >
            {ctx.guestName ? t("invite.welcome", { name: ctx.guestName }) : body}
          </p>
        </BlockShell>
      );

    case "COUPLE_INTRO":
      return (
        <BlockShell
          variant={block.styleVariant}
          style={heritage ? heritageShellStyle(heritage) : undefined}
        >
          <BlockHeader
            block={{
              ...block,
              title:
                !block.title || block.title === "Couple / Event Intro"
                  ? "Couple Intro"
                  : block.title,
            }}
            locale={locale}
            chrome={heritage}
          />
          <p
            className={cn(
              "text-center",
              heritage
                ? "font-[family-name:var(--font-cinzel)] text-xl sm:text-2xl font-semibold tracking-[0.04em] leading-snug"
                : "font-display text-2xl sm:text-3xl font-bold text-[#0F172A]"
            )}
            style={heritage ? { color: heritage.ink } : undefined}
          >
            {cj.highlight ?? ctx.hostName}
          </p>
        </BlockShell>
      );

    case "COUNTDOWN":
      return (
        <CountdownView
          target={cj.countdownTarget ?? ctx.eventDateRaw}
          label={block.title ?? t("invite.countdown")}
          begun={t("invite.celebration_begun")}
          chrome={ctx.layout === "traditional-marriage-ceremony" ? "linen" : "default"}
        />
      );

    case "EVENT_DETAILS":
      return (
        <BlockShell
          variant={block.styleVariant}
          style={heritage ? heritageShellStyle(heritage) : undefined}
        >
          <BlockHeader block={block} locale={locale} chrome={heritage} />
          <div className="space-y-3">
            {(cj.items ?? [
              { label: "Date", value: ctx.eventDate },
              { label: "Time", value: ctx.eventTime },
              { label: "Venue", value: ctx.venueName ?? ctx.landmark },
            ]).map((item) => (
              <div
                key={item.label}
                className={cn(
                  "flex justify-between gap-4 pb-2",
                  heritage
                    ? "border-b font-[family-name:var(--font-cormorant)] text-[15px]"
                    : "text-sm border-b border-slate-100"
                )}
                style={heritage ? { borderColor: heritage.border } : undefined}
              >
                <span
                  className={
                    heritage ? "uppercase tracking-[0.18em] text-[12px]" : "text-slate-500"
                  }
                  style={heritage ? { color: heritage.muted } : undefined}
                >
                  {item.label}
                </span>
                <span
                  className={cn(
                    "text-right",
                    heritage
                      ? "font-[family-name:var(--font-cinzel)] text-[13px] sm:text-sm font-medium tracking-[0.04em]"
                      : "font-medium text-[#0F172A]"
                  )}
                  style={heritage ? { color: heritage.ink } : undefined}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </BlockShell>
      );

    case "STORY":
    case "OBITUARY":
      if (!body && !ctx.story) return null;
      return (
        <BlockShell
          variant={block.styleVariant}
          style={heritage ? heritageShellStyle(heritage) : undefined}
        >
          <BlockHeader block={block} locale={locale} chrome={heritage} />
          <p
            className={cn(
              "leading-relaxed whitespace-pre-line",
              heritage
                ? "font-[family-name:var(--font-cormorant)] text-[15px]"
                : "text-slate-600"
            )}
            style={heritage ? { color: heritage.muted } : undefined}
          >
            {body || ctx.story}
          </p>
        </BlockShell>
      );

    case "GALLERY":
    case "MEMORIAL_GALLERY": {
      const items = block.galleryItems?.length
        ? block.galleryItems
        : (cj.items ?? []).map((i, idx) => ({ id: String(idx), url: i.value ?? i.label, caption: null, sortOrder: idx }));
      if (!items.length) return null;
      const galleryItems = items.map((item) => ({
        id: item.id,
        url: item.url,
        caption: item.caption,
        type: /\.(mp4|webm|mov)(\?|$)/i.test(item.url) ? ("video" as const) : ("image" as const),
      }));

      if (ctx.layout === "traditional-marriage-ceremony" && block.blockType === "GALLERY") {
        return (
          <TraditionalMarriageGallerySection
            items={galleryItems}
            interactive
            settings={{
              style: slideshowStyleFromVariant(block.styleVariant ?? "carousel"),
            }}
          />
        );
      }

      const styleVariant = block.styleVariant ?? "carousel";
      const isTm = ctx.layout === "traditional-marriage-ceremony";
      return (
        <BlockShell
          variant={block.styleVariant}
          className={cn(isTm && "border-[#E8C9B8] bg-[#FAF8F4]/95")}
          style={
            heritage && !isTm ? heritageShellStyle(heritage) : undefined
          }
        >
          <BlockHeader
            block={{
              ...block,
              title:
                isTm && (block.title === "Gallery" || !block.title)
                  ? "The Couple"
                  : block.title,
              subtitle:
                isTm && (!block.subtitle || block.title === "Gallery")
                  ? "In our frame"
                  : block.subtitle,
            }}
            locale={locale}
            editorial={isTm}
            chrome={heritage}
          />
          <InvitationGalleryDisplay
            items={galleryItems}
            settings={{ style: slideshowStyleFromVariant(styleVariant) }}
            interactive
            chrome={isTm ? "linen" : "default"}
          />
        </BlockShell>
      );
    }

    case "DRESS_CODE":
      if (!body && !ctx.dressCode) return null;
      return (
        <BlockShell
          variant={block.styleVariant}
          style={heritage ? heritageShellStyle(heritage) : undefined}
        >
          <div
            className={cn(
              "flex gap-3 items-start",
              heritage && "flex-col items-center text-center gap-0"
            )}
          >
            {heritage ? (
              <Shirt
                className="mb-1 h-5 w-5 shrink-0"
                style={{ color: heritage.accent }}
                aria-hidden
              />
            ) : (
              <Shirt className="mt-1 h-5 w-5 shrink-0 text-[#0B8A83]" />
            )}
            <div className={heritage ? "w-full" : undefined}>
              <BlockHeader block={block} locale={locale} chrome={heritage} />
              <p
                className={
                  heritage
                    ? "font-[family-name:var(--font-cormorant)] text-[15px] leading-relaxed"
                    : "font-medium text-[#0F172A]"
                }
                style={heritage ? { color: heritage.muted } : undefined}
              >
                {body || ctx.dressCode}
              </p>
            </div>
          </div>
        </BlockShell>
      );

    case "VENUE_MAPS":
    case "VENUE":
    case "BURIAL_DIRECTIONS": {
      const venueTitle =
        (typeof body === "string" && body.trim()) ||
        ctx.venueName ||
        ctx.landmark ||
        null;
      const mapsHref = cj.mapsUrl || ctx.mapsLink || null;
      return (
        <BlockShell
          variant={block.styleVariant}
          style={heritage ? heritageShellStyle(heritage) : undefined}
        >
          <BlockHeader block={block} locale={locale} chrome={heritage} />
          <VenueMapEmbed
            presentation="glimpse"
            mapsLink={mapsHref}
            venueName={ctx.venueName || venueTitle}
            landmark={ctx.landmark}
            accentColor={heritage?.accent ?? "#0B8A83"}
            heritage={
              heritage
                ? {
                    surface: heritage.surface,
                    border: heritage.border,
                    ink: heritage.ink,
                    muted: heritage.muted,
                    accent: heritage.accent,
                    radius: heritage.radius,
                  }
                : null
            }
            directionsLabel={t("invite.directions")}
          />
        </BlockShell>
      );
    }

    case "SCHEDULE":
    case "AGENDA":
    case "FUNERAL_PROGRAM":
      return (
        <BlockShell
          variant={block.styleVariant}
          style={heritage ? heritageShellStyle(heritage) : undefined}
        >
          <BlockHeader block={block} locale={locale} chrome={heritage} />
          <div className="space-y-4">
            {(cj.items ?? []).map((item, i) => (
              <div key={i} className="flex gap-4">
                {item.time && (
                  <span
                    className={cn(
                      "w-16 shrink-0 pt-0.5 text-xs font-semibold",
                      !heritage && "text-[#0B8A83]",
                      heritage &&
                        "font-[family-name:var(--font-cormorant)] uppercase tracking-[0.14em]"
                    )}
                    style={heritage ? { color: heritage.accent } : undefined}
                  >
                    {item.time}
                  </span>
                )}
                <div>
                  <p
                    className={cn(
                      "font-medium",
                      !heritage && "text-[#0F172A]",
                      heritage && "font-[family-name:var(--font-cinzel)] text-[15px]"
                    )}
                    style={heritage ? { color: heritage.ink } : undefined}
                  >
                    {item.label}
                  </p>
                  {item.description && (
                    <p
                      className={cn(
                        "text-sm",
                        !heritage && "text-slate-500",
                        heritage && "font-[family-name:var(--font-cormorant)]"
                      )}
                      style={heritage ? { color: heritage.muted } : undefined}
                    >
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {!cj.items?.length && body && (
              <p
                className={cn(
                  "whitespace-pre-line",
                  !heritage && "text-slate-600",
                  heritage && "font-[family-name:var(--font-cormorant)] text-[15px]"
                )}
                style={heritage ? { color: heritage.muted } : undefined}
              >
                {body}
              </p>
            )}
          </div>
        </BlockShell>
      );

    case "RSVP":
      if (!ctx.invitationId) return null;
      return (
        <BlockShell variant={block.styleVariant}>
          <BlockHeader block={block} locale={locale} />
          <InvitationRsvpPanel
            invitationId={ctx.invitationId}
            guestId={ctx.guestId}
            guestName={ctx.guestName}
          />
        </BlockShell>
      );

    case "GIFT_REGISTRY":
    case "CONTRIBUTION_LINK":
      return (
        <BlockShell variant={block.styleVariant}>
          <BlockHeader block={block} locale={locale} />
          {body && <p className="text-slate-600 mb-4">{body}</p>}
          {cj.registryUrl && (
            <Button asChild className="bg-[#0B8A83] hover:bg-[#097068]">
              <a href={cj.registryUrl} target="_blank" rel="noopener noreferrer">
                <Gift className="h-4 w-4 mr-2" />
                {cj.ctaLabel ?? "View Registry"}
              </a>
            </Button>
          )}
        </BlockShell>
      );

    case "CONTACT_HOST":
    case "FAMILY_CONTACTS":
      // TM: Kindly Respond already owns “Reach the hosts”, skip duplicate teal button cards
      if (ctx.layout === "traditional-marriage-ceremony") return null;
      return (
        <BlockShell variant={block.styleVariant}>
          <BlockHeader block={block} locale={locale} />
          <div className="flex flex-wrap gap-3 justify-center">
            {(cj.phone || ctx.contactPhone) && (
              <Button variant="outline" asChild>
                <a href={`tel:${cj.phone || ctx.contactPhone}`}>
                  <Phone className="h-4 w-4 mr-2" /> {t("invite.contact_host")}
                </a>
              </Button>
            )}
            {(cj.email || ctx.contactEmail) && (
              <Button variant="outline" asChild>
                <a href={`mailto:${cj.email || ctx.contactEmail}`}>
                  <Mail className="h-4 w-4 mr-2" /> Email
                </a>
              </Button>
            )}
          </div>
        </BlockShell>
      );

    case "QR_GUEST_PASS":
    case "TICKET_PASS":
      if (!ctx.qrDataUrl && !ctx.admissionManualCode) return null;
      return (
        <BlockShell variant={block.styleVariant}>
          <BlockHeader block={block} locale={locale} />
          <div className="text-center flex flex-col items-center justify-center gap-3">
            {ctx.qrDataUrl && <BrandedQrImage src={ctx.qrDataUrl} size={140} showDownload />}
            {ctx.admissionManualCode && (
              <ManualGateCodeReveal code={ctx.admissionManualCode} variant="pass" />
            )}
          </div>
        </BlockShell>
      );

    case "THANK_YOU":
      if (ctx.layout === "traditional-marriage-ceremony") {
        return (
          <TraditionalMarriageThankYou
            message={
              ctx.thankYouMessage?.trim() ||
              body ||
              "Your presence is a blessing. We are deeply honoured to share this sacred day with you."
            }
            fontFamily={ctx.thankYouFontFamily}
            eyebrowFontFamily={ctx.thankYouEyebrowFontFamily}
            scriptFontFamily={ctx.thankYouScriptFontFamily}
          />
        );
      }
      return (
        <BlockShell variant={block.styleVariant} className="text-center">
          <BlockHeader block={block} locale={locale} />
          <p className="text-slate-600 whitespace-pre-line">
            {ctx.thankYouMessage?.trim() || body || "Thank you for being part of our celebration."}
          </p>
        </BlockShell>
      );

    case "CUSTOM":
      return (
        <BlockShell variant={block.styleVariant}>
          <BlockHeader block={block} locale={locale} />
          {body && <p className="text-slate-600 whitespace-pre-line text-center leading-relaxed">{body}</p>}
          {cj.highlight && (
            <p className="mt-3 text-center text-sm font-medium text-[#0B8A83]">{cj.highlight}</p>
          )}
          {cj.ctaLabel && cj.ctaUrl && (
            <div className="mt-5 text-center">
              <Button className="bg-[#0B8A83] hover:bg-[#097068]" asChild>
                <a href={cj.ctaUrl} target="_blank" rel="noopener noreferrer">
                  {cj.ctaLabel}
                </a>
              </Button>
            </div>
          )}
        </BlockShell>
      );

    case "MEMORY_VAULT":
      return (
        <BlockShell variant={block.styleVariant}>
          <BlockHeader block={block} locale={locale} />
          <p className="text-slate-600 text-center">{body || "A lifetime archive for your cherished memories."}</p>
          {ctx.memoryVaultEnabled && ctx.eventId && (
            <div className="mt-4 text-center">
              <a
                href={`/dashboard/memory?eventId=${ctx.eventId}`}
                className="inline-flex items-center gap-2 rounded-full bg-[#0B8A83] px-5 py-2 text-sm text-white hover:bg-[#097068] transition-colors"
              >
                Open Memory Vault
              </a>
            </div>
          )}
        </BlockShell>
      );

    case "SPEAKERS":
      return (
        <BlockShell variant={block.styleVariant}>
          <BlockHeader block={block} locale={locale} />
          <div className="grid sm:grid-cols-2 gap-4">
            {(cj.items ?? []).map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-100 p-4 text-center">
                <Users className="h-8 w-8 mx-auto text-[#0B8A83] mb-2" />
                <p className="font-semibold">{item.label}</p>
                {item.description && <p className="text-sm text-slate-500">{item.description}</p>}
              </div>
            ))}
          </div>
        </BlockShell>
      );

    case "SPONSORS":
    case "REGISTRATION":
    case "MENU":
    case "SEATING_INFO":
      return (
        <BlockShell variant={block.styleVariant}>
          <BlockHeader block={block} locale={locale} />
          {body && <p className="text-slate-600 whitespace-pre-line">{body}</p>}
          {ctx.seatLookupUrl ? (
            <div className="mt-4 rounded-xl border border-[#0B8A83]/20 bg-[#0B8A83]/5 p-4 text-center">
              <p className="text-sm text-slate-600 mb-3">Scan or tap to find your table and seat</p>
              <Button className="bg-[#0B8A83]" asChild>
                <a href={ctx.seatLookupUrl} target="_blank" rel="noopener noreferrer">View my seating</a>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-500 mt-2">Seating assignments will appear here once finalized.</p>
          )}
        </BlockShell>
      );
    case "HOTEL_TRAVEL":
    case "TRIBUTE_WALL":
    case "CERTIFICATE_INFO":
    default:
      return (
        <BlockShell variant={block.styleVariant}>
          <BlockHeader block={block} locale={locale} />
          {body && <p className="text-slate-600 whitespace-pre-line">{body}</p>}
          {cj.items && cj.items.length > 0 && (
            <ul className="mt-3 space-y-2">
              {cj.items.map((item, i) => (
                <li key={i} className="text-sm text-slate-700">
                  <span className="font-medium">{item.label}</span>
                  {item.value && `: ${item.value}`}
                </li>
              ))}
            </ul>
          )}
          {cj.ctaUrl && (
            <Button className="mt-4 bg-[#0B8A83]" asChild>
              <a href={cj.ctaUrl}>{cj.ctaLabel ?? "Learn more"}</a>
            </Button>
          )}
        </BlockShell>
      );
  }
}
