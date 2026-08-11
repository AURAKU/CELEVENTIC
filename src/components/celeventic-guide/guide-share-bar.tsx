"use client";

import { useState } from "react";
import { Link2, Mail, MessageCircle, QrCode, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackGuideEvent } from "@/lib/celeventic-guide/analytics";

export function GuideShareBar({ slug, title }: { slug: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const guideUrl = () => `${window.location.origin}/guide/${slug}`;

  const share = async () => {
    const url = guideUrl();
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} · Celeventic Guide`, url });
        trackGuideEvent("guide_share", { slug, method: "native" });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        trackGuideEvent("guide_share", { slug, method: "clipboard" });
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* cancelled */
    }
  };

  const copyLink = async () => {
    const url = guideUrl();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    trackGuideEvent("guide_share", { slug, method: "clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const url = guideUrl();
    const text = `${title} · Celeventic Guide\n${url}`;
    const href = `https://wa.me/?text=${encodeURIComponent(text)}`;
    trackGuideEvent("guide_share", { slug, method: "whatsapp" });
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const shareEmail = () => {
    const url = guideUrl();
    const subject = `${title} · Celeventic Guide`;
    const body = `I thought you might find this helpful:\n\n${title}\n${url}\n`;
    const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    trackGuideEvent("guide_share", { slug, method: "email" });
    window.location.href = href;
  };

  const loadQr = async () => {
    if (qrUrl) {
      setQrUrl(null);
      return;
    }
    setQrUrl(`/api/guides/${encodeURIComponent(slug)}/qr`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={share}>
        <Share2 className="h-4 w-4 mr-1.5" /> Share
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={copyLink}>
        <Link2 className="h-4 w-4 mr-1.5" /> {copied ? "Copied" : "Copy link"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={shareWhatsApp} aria-label="Share on WhatsApp">
        <MessageCircle className="h-4 w-4 mr-1.5" /> WhatsApp
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={shareEmail} aria-label="Share by email">
        <Mail className="h-4 w-4 mr-1.5" /> Email
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={loadQr}>
        <QrCode className="h-4 w-4 mr-1.5" /> QR
      </Button>
      {qrUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrUrl} alt={`QR code for ${title}`} className="h-28 w-28 rounded-lg border border-slate-200" />
      )}
    </div>
  );
}
