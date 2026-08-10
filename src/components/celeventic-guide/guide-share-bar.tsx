"use client";

import { useState } from "react";
import { Link2, QrCode, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackGuideEvent } from "@/lib/celeventic-guide/analytics";

export function GuideShareBar({ slug, title }: { slug: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const share = async () => {
    const url = `${window.location.origin}/guide/${slug}`;
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
    const url = `${window.location.origin}/guide/${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    trackGuideEvent("guide_share", { slug, method: "clipboard" });
    setTimeout(() => setCopied(false), 2000);
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
