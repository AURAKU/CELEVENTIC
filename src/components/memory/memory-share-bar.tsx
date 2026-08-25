"use client";

import { useState } from "react";
import { Check, Copy, Download, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolvePublicMediaUrl } from "@/lib/uploads/media-url";
import {
  InstagramIcon,
  SnapchatIcon,
  TikTokIcon,
  TrendshubIcon,
  WhatsAppIcon,
} from "@/components/memory/icons/social-brand-icons";
import {
  STORY_APPS_TIP,
  TRENDSHUB_SHARE_TIP,
  buildMemoryShareUrl,
  buildWhatsAppShareHref,
  copyText,
  nativeShare,
} from "@/lib/memory/memory-share";

interface MemoryShareBarProps {
  viewToken: string;
  memoryId: string;
  eventTitle: string;
  mediaUrl: string;
  allowDownload?: boolean;
  compact?: boolean;
  className?: string;
}

export function MemoryShareBar({
  viewToken,
  memoryId,
  eventTitle,
  mediaUrl,
  allowDownload,
  compact,
  className,
}: MemoryShareBarProps) {
  const [tip, setTip] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function shareUrl() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return buildMemoryShareUrl({ origin, viewToken, memoryId });
  }

  async function showTip(message: string) {
    setTip(message);
    window.setTimeout(() => setTip(null), 3200);
  }

  async function onNative() {
    const url = shareUrl();
    const result = await nativeShare({
      title: eventTitle,
      text: `A memory from ${eventTitle}`,
      url,
    });
    if (result === "unavailable") {
      const ok = await copyText(url);
      setCopied(ok);
      await showTip(ok ? "Link copied — paste anywhere to share." : "Could not share from this browser.");
    }
  }

  async function onWhatsApp() {
    const href = buildWhatsAppShareHref(shareUrl(), eventTitle);
    window.open(href, "_blank", "noopener,noreferrer");
  }

  async function onStoryApp(label: string) {
    const ok = await copyText(shareUrl());
    setCopied(ok);
    await showTip(ok ? `${label}: ${STORY_APPS_TIP}` : `Could not copy link for ${label}.`);
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      void nativeShare({
        title: eventTitle,
        text: `A memory from ${eventTitle}`,
        url: shareUrl(),
      });
    }
  }

  async function onTrendshub() {
    const ok = await copyText(shareUrl());
    setCopied(ok);
    await showTip(ok ? TRENDSHUB_SHARE_TIP : "Could not copy link.");
  }

  async function onCopy() {
    const ok = await copyText(shareUrl());
    setCopied(ok);
    await showTip(ok ? "Link copied." : "Could not copy link.");
  }

  const btn =
    "inline-flex items-center justify-center rounded-full min-h-11 min-w-11 touch-manipulation transition active:scale-95";

  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn("flex flex-wrap items-center gap-2", compact && "gap-1.5")}>
        <button type="button" className={cn(btn, "bg-white/15 text-white")} onClick={() => void onNative()} aria-label="Share">
          <Share2 className="h-4 w-4" />
        </button>
        <button type="button" className={cn(btn, "bg-[#25D366]/20")} onClick={() => void onWhatsApp()} aria-label="Share on WhatsApp">
          <WhatsAppIcon className="h-5 w-5" />
        </button>
        <button type="button" className={cn(btn, "bg-white/10")} onClick={() => void onStoryApp("Instagram")} aria-label="Share to Instagram">
          <InstagramIcon className="h-5 w-5" />
        </button>
        <button type="button" className={cn(btn, "bg-white/10")} onClick={() => void onStoryApp("Snapchat")} aria-label="Share to Snapchat">
          <SnapchatIcon className="h-5 w-5" />
        </button>
        <button type="button" className={cn(btn, "bg-white/10")} onClick={() => void onStoryApp("TikTok")} aria-label="Share to TikTok">
          <TikTokIcon className="h-5 w-5" />
        </button>
        <button type="button" className={cn(btn, "bg-white/10")} onClick={() => void onTrendshub()} aria-label="Share to Trendshub">
          <TrendshubIcon className="h-5 w-5" />
        </button>
        <button type="button" className={cn(btn, "bg-white/15 text-white")} onClick={() => void onCopy()} aria-label="Copy link">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
        {allowDownload ? (
          <a
            className={cn(btn, "bg-white/15 text-white")}
            href={resolvePublicMediaUrl(mediaUrl)}
            download
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download"
          >
            <Download className="h-4 w-4" />
          </a>
        ) : null}
      </div>
      {tip ? <p className="text-[11px] text-white/80 leading-snug">{tip}</p> : null}
    </div>
  );
}
