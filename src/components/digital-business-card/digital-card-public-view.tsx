"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Download,
  ExternalLink,
  Globe,
  Linkedin,
  Mail,
  Phone,
  Share2,
  Smartphone,
  Instagram,
  Github,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DigitalCardFace } from "@/components/digital-business-card/digital-card-face";
import { resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import {
  digitalCardPublicUrl,
  type DigitalCardPublicPayload,
} from "@/lib/digital-business-card/types";
import { buildVCard } from "@/lib/digital-business-card/vcard";

function socialHref(kind: string, value: string): string {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (kind === "whatsapp") {
    const digits = v.replace(/\D/g, "");
    return `https://wa.me/${digits}`;
  }
  if (kind === "linkedin") return `https://www.linkedin.com/in/${v.replace(/^@/, "")}`;
  if (kind === "instagram") return `https://instagram.com/${v.replace(/^@/, "")}`;
  if (kind === "x") return `https://x.com/${v.replace(/^@/, "")}`;
  if (kind === "facebook") return `https://facebook.com/${v.replace(/^@/, "")}`;
  if (kind === "youtube") return `https://youtube.com/${v}`;
  if (kind === "tiktok") return `https://tiktok.com/@${v.replace(/^@/, "")}`;
  if (kind === "github") return `https://github.com/${v.replace(/^@/, "")}`;
  if (kind === "website") return v.startsWith("http") ? v : `https://${v}`;
  return v;
}

const SOCIAL_META: { key: keyof DigitalCardPublicPayload["socials"]; label: string; Icon: typeof Globe }[] = [
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin },
  { key: "website", label: "Website", Icon: Globe },
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "x", label: "X", Icon: ExternalLink },
  { key: "facebook", label: "Facebook", Icon: ExternalLink },
  { key: "whatsapp", label: "WhatsApp", Icon: Phone },
  { key: "youtube", label: "YouTube", Icon: ExternalLink },
  { key: "tiktok", label: "TikTok", Icon: ExternalLink },
  { key: "github", label: "GitHub", Icon: Github },
];

export function DigitalCardPublicView({
  card,
  origin,
}: {
  card: DigitalCardPublicPayload;
  origin: string;
}) {
  const theme = resolveDigitalCardTheme(card.themeId);
  const publicUrl = digitalCardPublicUrl(card.slug, origin);
  const qrSrc = `/api/qr/image?data=${encodeURIComponent(publicUrl)}&size=512`;
  const [nfcMsg, setNfcMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const links = useMemo(() => {
    const out: { key: string; label: string; href: string; Icon: typeof Globe }[] = [];
    for (const meta of SOCIAL_META) {
      const raw = card.socials[meta.key];
      if (raw) out.push({ key: meta.key, label: meta.label, href: socialHref(meta.key, raw), Icon: meta.Icon });
    }
    if (card.website && !card.socials.website) {
      out.unshift({
        key: "website",
        label: "Website",
        href: socialHref("website", card.website),
        Icon: Globe,
      });
    }
    return out;
  }, [card]);

  const downloadVCard = useCallback(() => {
    const blob = new Blob([buildVCard(card)], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${card.slug}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [card]);

  const shareCard = useCallback(async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: card.displayName, text: "Digital business card", url: publicUrl });
        return;
      }
    } catch {
      /* fall through */
    }
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [card.displayName, publicUrl]);

  const writeNfc = useCallback(async () => {
    if (!card.nfcEnabled) {
      setNfcMsg("NFC sharing is turned off for this card.");
      return;
    }
    const nav = navigator as Navigator & {
      nfc?: { write: (message: unknown) => Promise<void> };
    };
    // Web NFC (Chrome Android). Elsewhere: copy URL for any NFC writer app.
    if (!nav.nfc) {
      try {
        await navigator.clipboard.writeText(publicUrl);
        setNfcMsg("URL copied — paste into your NFC writer app to program a tag.");
      } catch {
        setNfcMsg("Copy this link into an NFC writer: " + publicUrl);
      }
      return;
    }
    try {
      await nav.nfc.write({
        records: [{ recordType: "url", data: publicUrl }],
      });
      setNfcMsg("NFC tag written. Tap phones to open this card.");
    } catch {
      setNfcMsg("Could not write NFC. Copy the link and use an NFC writer app.");
    }
  }, [card.nfcEnabled, publicUrl]);

  if (!card.isLive) {
    return (
      <main
        className="min-h-app-viewport flex items-center justify-center px-4"
        style={{ background: theme.stageBackground }}
      >
        <div className="max-w-md rounded-2xl border border-slate-200/80 bg-white/90 p-8 text-center shadow-xl backdrop-blur">
          <p className="font-display text-xl font-semibold text-slate-900">Card unavailable</p>
          <p className="mt-2 text-sm text-slate-600">
            This digital business card is offline. The owner can renew their monthly plan to keep the
            link live.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-app-viewport" style={{ background: theme.stageBackground }}>
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10 sm:py-14">
        <DigitalCardFace
          themeId={card.themeId}
          displayName={card.displayName}
          title={card.title}
          company={card.company}
          avatarUrl={card.avatarUrl}
          qrSrc={qrSrc}
        />

        {card.bio ? (
          <p className="text-center text-sm leading-relaxed" style={{ color: theme.muted }}>
            {card.bio}
          </p>
        ) : null}

        <div className="grid gap-2">
          {card.email ? (
            <a
              href={`mailto:${card.email}`}
              className="flex items-center gap-3 rounded-xl border bg-white/80 px-4 py-3 text-sm font-medium shadow-sm backdrop-blur transition hover:shadow-md"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              <Mail className="h-4 w-4 shrink-0" style={{ color: theme.accent }} />
              {card.email}
            </a>
          ) : null}
          {card.phone ? (
            <a
              href={`tel:${card.phone}`}
              className="flex items-center gap-3 rounded-xl border bg-white/80 px-4 py-3 text-sm font-medium shadow-sm backdrop-blur transition hover:shadow-md"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              <Phone className="h-4 w-4 shrink-0" style={{ color: theme.accent }} />
              {card.phone}
            </a>
          ) : null}
          {links.map((link) => (
            <a
              key={link.key}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border bg-white/80 px-4 py-3 text-sm font-medium shadow-sm backdrop-blur transition hover:shadow-md"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              <link.Icon className="h-4 w-4 shrink-0" style={{ color: theme.accent }} />
              {link.label}
              <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-40" />
            </a>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Button type="button" onClick={downloadVCard} className="bg-[#0B8A83] hover:bg-[#097a74]">
            <Download className="mr-2 h-4 w-4" />
            Save contact
          </Button>
          <Button type="button" variant="outline" onClick={shareCard}>
            <Share2 className="mr-2 h-4 w-4" />
            {copied ? "Link copied" : "Share"}
          </Button>
          <Button type="button" variant="outline" onClick={writeNfc}>
            <Smartphone className="mr-2 h-4 w-4" />
            NFC
          </Button>
        </div>
        {nfcMsg ? (
          <p className="text-center text-xs" style={{ color: theme.muted }}>
            {nfcMsg}
          </p>
        ) : null}

        <p className="text-center text-[11px] tracking-wide uppercase" style={{ color: theme.muted }}>
          Powered by Celeventic
        </p>
      </div>
    </main>
  );
}
