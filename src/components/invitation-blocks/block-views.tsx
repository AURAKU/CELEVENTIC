"use client";

import { useState, useEffect } from "react";
import { MapPin, Clock, Shirt, Phone, Mail, Gift, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvitationRsvpPanel } from "@/components/invitation/shared/invitation-rsvp-panel";
import { BlockShell } from "@/components/invitation-blocks/block-shell";
import type { InvitationBlockDto, BlockRenderContext } from "@/lib/invitation-blocks/block-types";
import { useLocale } from "@/components/i18n/locale-provider";
import { BrandedQrImage } from "@/components/qr/branded-qr-image";
import { ManualGateCodeReveal } from "@/components/qr/manual-gate-code-reveal";
import { InvitationGalleryDisplay, slideshowStyleFromVariant } from "@/components/invitation/invitation-gallery-display";

function BlockHeader({ block, locale }: { block: InvitationBlockDto; locale: string }) {
  const localized = block.contents?.find((c) => c.language === locale);
  const title = localized?.title ?? block.title;
  const subtitle = localized?.subtitle ?? block.subtitle;
  if (!title && !subtitle) return null;
  return (
    <div className="mb-5 text-center">
      {title && <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0F172A]">{title}</h2>}
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

function CountdownView({ target, label, begun }: { target?: string; label: string; begun: string }) {
  const [left, setLeft] = useState("");

  useEffect(() => {
    if (!target) return;
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
  }, [target, begun]);

  if (!target) return null;

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

  switch (block.blockType) {
    case "WELCOME":
      return (
        <BlockShell variant={block.styleVariant}>
          <BlockHeader block={block} locale={locale} />
          <p className="text-center text-lg text-[#0B8A83] font-medium">
            {ctx.guestName ? t("invite.welcome", { name: ctx.guestName }) : body}
          </p>
        </BlockShell>
      );

    case "COUPLE_INTRO":
      return (
        <BlockShell variant={block.styleVariant}>
          <BlockHeader block={block} locale={locale} />
          <p className="text-center font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">
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
        />
      );

    case "EVENT_DETAILS":
      return (
        <BlockShell variant={block.styleVariant}>
          <BlockHeader block={block} locale={locale} />
          <div className="space-y-3">
            {(cj.items ?? [
              { label: "Date", value: ctx.eventDate },
              { label: "Time", value: ctx.eventTime },
              { label: "Venue", value: ctx.venueName ?? ctx.landmark },
            ]).map((item) => (
              <div key={item.label} className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-500">{item.label}</span>
                <span className="font-medium text-[#0F172A]">{item.value}</span>
              </div>
            ))}
          </div>
        </BlockShell>
      );

    case "STORY":
    case "OBITUARY":
      if (!body && !ctx.story) return null;
      return (
        <BlockShell variant={block.styleVariant}>
          <BlockHeader block={block} locale={locale} />
          <p className="text-slate-600 leading-relaxed whitespace-pre-line">{body || ctx.story}</p>
        </BlockShell>
      );

    case "GALLERY":
    case "MEMORIAL_GALLERY": {
      const items = block.galleryItems?.length
        ? block.galleryItems
        : (cj.items ?? []).map((i, idx) => ({ id: String(idx), url: i.value ?? i.label, caption: null, sortOrder: idx }));
      if (!items.length) return null;
      const styleVariant = block.styleVariant ?? "carousel";
      return (
        <BlockShell variant={block.styleVariant}>
          <BlockHeader block={block} locale={locale} />
          <InvitationGalleryDisplay
            items={items.map((item) => ({
              id: item.id,
              url: item.url,
              caption: item.caption,
              type: /\.(mp4|webm|mov)(\?|$)/i.test(item.url) ? "video" as const : "image" as const,
            }))}
            settings={{ style: slideshowStyleFromVariant(styleVariant) }}
            interactive
          />
        </BlockShell>
      );
    }

    case "DRESS_CODE":
      if (!body && !ctx.dressCode) return null;
      return (
        <BlockShell variant={block.styleVariant}>
          <div className="flex gap-3 items-start">
            <Shirt className="h-5 w-5 text-[#0B8A83] shrink-0 mt-1" />
            <div>
              <BlockHeader block={block} locale={locale} />
              <p className="font-medium text-[#0F172A]">{body || ctx.dressCode}</p>
            </div>
          </div>
        </BlockShell>
      );

    case "VENUE_MAPS":
    case "VENUE":
    case "BURIAL_DIRECTIONS":
      return (
        <BlockShell variant={block.styleVariant}>
          <div className="flex gap-3 items-start">
            <MapPin className="h-5 w-5 text-[#0B8A83] shrink-0 mt-1" />
            <div className="flex-1">
              <BlockHeader block={block} locale={locale} />
              <p className="font-medium">{body || ctx.venueName || ctx.landmark}</p>
              {(cj.mapsUrl || ctx.mapsLink) && (
                <a
                  href={cj.mapsUrl || ctx.mapsLink!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-sm text-[#0B8A83] hover:underline"
                >
                  {t("invite.directions")}
                </a>
              )}
            </div>
          </div>
        </BlockShell>
      );

    case "SCHEDULE":
    case "AGENDA":
    case "FUNERAL_PROGRAM":
      return (
        <BlockShell variant={block.styleVariant}>
          <BlockHeader block={block} locale={locale} />
          <div className="space-y-4">
            {(cj.items ?? []).map((item, i) => (
              <div key={i} className="flex gap-4">
                {item.time && (
                  <span className="text-xs font-semibold text-[#0B8A83] w-16 shrink-0 pt-0.5">{item.time}</span>
                )}
                <div>
                  <p className="font-medium text-[#0F172A]">{item.label}</p>
                  {item.description && <p className="text-sm text-slate-500">{item.description}</p>}
                </div>
              </div>
            ))}
            {!cj.items?.length && body && <p className="text-slate-600 whitespace-pre-line">{body}</p>}
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
      return (
        <BlockShell variant={block.styleVariant} className="text-center">
          <BlockHeader block={block} locale={locale} />
          <p className="text-slate-600">{body || "Thank you for being part of our celebration."}</p>
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
