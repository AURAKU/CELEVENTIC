"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Check,
  Copy,
  Download,
  ExternalLink,
  Pencil,
  QrCode,
  Share2,
  Smartphone,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CeleYouBrandMark } from "@/components/digital-business-card/celeyou-brand-mark";
import { CeleYouTrialCta } from "@/components/digital-business-card/celeyou-trial-cta";
import { SMARTCARD_BRAND_TAGLINE } from "@/lib/digital-business-card/product";
import { celeYouEmailShareHref, celeYouPrintQrPngSrc, celeYouWhatsAppShareHref } from "@/lib/digital-business-card/share-channels";
import type { CeleYouWelcomeAction } from "@/lib/digital-business-card/activation";

const ICONS: Record<string, typeof Share2> = {
  view: ExternalLink,
  share: Share2,
  qr: QrCode,
  contact: UserPlus,
  edit: Pencil,
  nfc: Smartphone,
  analytics: BarChart3,
};

export function CeleYouWelcomeDesk({
  displayName,
  profileUrl,
  qrUrl,
  contactHref,
  actions,
  onShare,
  onFirstShare,
}: {
  displayName: string;
  profileUrl: string;
  qrUrl: string;
  contactHref?: string | null;
  actions: CeleYouWelcomeAction[];
  onShare?: () => Promise<void> | void;
  onFirstShare?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const qrDownload = qrUrl ? celeYouPrintQrPngSrc(qrUrl) : "";
  const caption = `${displayName} · CeleYou`;

  async function copyLink() {
    if (!profileUrl) return;
    await navigator.clipboard.writeText(profileUrl).catch(() => undefined);
    setCopied(true);
    onFirstShare?.();
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareCard() {
    if (onShare) {
      await onShare();
      setShared(true);
      onFirstShare?.();
      return;
    }
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: caption, text: caption, url: profileUrl });
        setShared(true);
        onFirstShare?.();
        return;
      } catch (error) {
        if ((error as { name?: string })?.name === "AbortError") return;
      }
    }
    await copyLink();
  }

  return (
    <section className="space-y-6" aria-labelledby="celeyou-welcome-heading">
      <div className="rounded-3xl border border-[#0B8A83]/20 bg-gradient-to-br from-[#034746] to-[#0B8A83] px-5 py-7 text-white sm:px-8">
        <CeleYouBrandMark variant="chip" tone="dark" className="mb-4" markClassName="h-8 w-8" />
        <h1 id="celeyou-welcome-heading" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Your CeleYou is live
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/85">
          {SMARTCARD_BRAND_TAGLINE} Share the link or QR. Guests open it in any browser. No app, no account. Your public identity stays on CeleYou Free.
        </p>
        {profileUrl ? (
          <p className="mt-4 truncate text-sm font-medium text-[#7FF0E4]">{profileUrl}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = ICONS[action.id] ?? Share2;
          if (action.kind === "share") {
            return (
              <Button key={action.id} type="button" size="lg" className="h-12 w-full justify-start" onClick={() => void shareCard()}>
                {shared ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                {shared ? "Shared" : action.label}
              </Button>
            );
          }
          if (action.kind === "qr") {
            return (
              <Button key={action.id} type="button" variant="outline" size="lg" className="h-12 w-full justify-start" asChild>
                <a href={qrDownload || undefined} download>
                  <Download className="h-4 w-4" />
                  {action.label}
                </a>
              </Button>
            );
          }
          if (action.kind === "contact") {
            return (
              <Button key={action.id} type="button" variant="outline" size="lg" className="h-12 w-full justify-start" asChild>
                <a href={contactHref || undefined}>
                  <Icon className="h-4 w-4" />
                  {action.label}
                </a>
              </Button>
            );
          }
          return (
            <Button key={action.id} type="button" variant="outline" size="lg" className="h-12 w-full justify-start" asChild>
              <Link href={action.href || "/dashboard/business-card"}>
                <Icon className="h-4 w-4" />
                {action.label}
              </Link>
            </Button>
          );
        })}
      </div>

      <CeleYouTrialCta />

      {profileUrl ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => void copyLink()}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Link copied" : "Copy link"}
          </Button>
          <Button type="button" variant="ghost" size="sm" asChild>
            <a href={celeYouWhatsAppShareHref(caption, profileUrl)} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </Button>
          <Button type="button" variant="ghost" size="sm" asChild>
            <a href={celeYouEmailShareHref(caption, caption, profileUrl)}>Email</a>
          </Button>
        </div>
      ) : null}
    </section>
  );
}
