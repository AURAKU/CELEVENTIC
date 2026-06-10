"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Share2, Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvitationRenderer } from "@/components/invitation/invitation-renderer";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import { useLocale } from "@/components/i18n/locale-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { BlockRenderer } from "@/components/invitation-blocks/block-renderer";
import type { AppLocale } from "@/lib/i18n/constants";
import type { InvitationBlockDto, BlockRenderContext } from "@/lib/invitation-blocks/block-types";

export interface LocalizedInviteContent {
  eventTitle?: string | null;
  story?: string | null;
  dressCode?: string | null;
  venueName?: string | null;
  landmark?: string | null;
  hostName?: string | null;
}

export interface PremiumInviteExperienceProps {
  invitation: { id: string; name: string; message: string | null; uniqueLink: string };
  event: {
    title: string;
    hostName: string;
    description: string | null;
    startDate: string;
    startDateRaw: string;
    venueName: string | null;
    landmark: string | null;
    mapsLink: string | null;
    contactPhone: string | null;
    dressCode: string | null;
    coverImageUrl?: string | null;
  };
  design: InvitationDesignConfig;
  guestId?: string;
  guestName?: string;
  qrDataUrl?: string;
  galleryUrls?: string[];
  allowedLocales?: AppLocale[];
  localizedVersions?: Partial<Record<AppLocale, LocalizedInviteContent>>;
  blocks?: InvitationBlockDto[];
  memoryVaultEnabled?: boolean;
  eventId?: string;
}

function Countdown({ target, begunLabel, label }: { target: string; begunLabel: string; label: string }) {
  const [left, setLeft] = useState("");

  useEffect(() => {
    function tick() {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setLeft(begunLabel);
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
  }, [target, begunLabel]);

  return (
    <div className="rounded-2xl bg-[#0F172A] text-white p-6 text-center">
      <Clock className="h-6 w-6 mx-auto text-[#D4A63A] mb-2" />
      <p className="text-xs uppercase tracking-widest text-white/60">{label}</p>
      <p className="font-display text-2xl font-bold mt-2">{left}</p>
    </div>
  );
}

export function PremiumInviteExperience(props: PremiumInviteExperienceProps) {
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

  return (
    <div className="min-h-screen bg-[#FAF8F4]">
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

      <section className="mx-auto max-w-2xl px-4 py-10 space-y-6">
        {useBlocks ? (
          <>
            <BlockRenderer blocks={props.blocks!} context={blockContext} />
            <div className="flex flex-wrap gap-3 justify-center pt-4">
              <Button variant="outline" onClick={handleShare}>
                {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                {copied ? t("invite.copied") : t("invite.share")}
              </Button>
            </div>
          </>
        ) : (
          <>
            {props.guestName && (
              <p className="text-center text-lg text-[#0B8A83] font-medium">
                {t("invite.welcome", { name: props.guestName })}
              </p>
            )}
            <Countdown
              target={props.event.startDateRaw}
              label={t("invite.countdown")}
              begunLabel={t("invite.celebration_begun")}
            />
            {displayEvent.description && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 inv-fade-in">
                <h2 className="font-display text-lg font-bold text-[#0F172A]">{t("invite.our_story")}</h2>
                <p className="mt-3 text-slate-600 leading-relaxed whitespace-pre-line">{displayEvent.description}</p>
              </div>
            )}
          </>
        )}

        <p className="text-center text-xs text-slate-400 pb-8">
          <Link href="/" className="text-[#0B8A83] hover:underline">Celeventic</Link> — {t("invite.tagline")}
        </p>
      </section>
    </div>
  );
}
