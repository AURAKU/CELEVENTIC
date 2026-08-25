"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Download,
  ExternalLink,
  Globe,
  Linkedin,
  Mail,
  Phone,
  QrCode,
  Share2,
  Smartphone,
  Instagram,
  Github,
  Handshake,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DigitalCardFace } from "@/components/digital-business-card/digital-card-face";
import { resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import {
  digitalCardPublicUrl,
  type DigitalCardPublicPayload,
} from "@/lib/digital-business-card/types";
import { buildVCard } from "@/lib/digital-business-card/vcard";
import { detectNfcWriteSupport } from "@/lib/digital-business-card/nfc-capability";
import { smartCardShortUrl } from "@/lib/digital-business-card/product";
import { SMARTCARD_PROFILE_MODES } from "@/lib/digital-business-card/product";

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

const SOCIAL_META: {
  key: keyof DigitalCardPublicPayload["socials"];
  label: string;
  Icon: typeof Globe;
}[] = [
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
  const shortUrl = smartCardShortUrl(card.publicToken, origin);
  const qrSrc = `/api/qr/image?data=${encodeURIComponent(shortUrl)}&size=512`;
  const [nfcMsg, setNfcMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [nfcSupport] = useState(() => detectNfcWriteSupport());
  const [shareMode, setShareMode] = useState(card.defaultMode || "professional");
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectDone, setConnectDone] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [form, setForm] = useState({
    visitorName: "",
    visitorEmail: "",
    visitorPhone: "",
    note: "",
    website: "",
  });

  useEffect(() => {
    setNfcMsg(nfcSupport.guidance);
  }, [nfcSupport.guidance]);

  const modeLabel =
    SMARTCARD_PROFILE_MODES.find((m) => m.id === shareMode)?.label || "Professional";

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
        await navigator.share({
          title: card.displayName,
          text: `${card.displayName} · Celeventic SmartCard`,
          url: shortUrl,
        });
        return;
      }
    } catch {
      /* fall through */
    }
    await navigator.clipboard.writeText(shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [card.displayName, shortUrl]);

  const writeNfc = useCallback(async () => {
    if (!card.nfcEnabled) {
      setNfcMsg("NFC sharing is turned off for this card.");
      return;
    }
    const support = detectNfcWriteSupport();
    if (!support.canWrite) {
      try {
        await navigator.clipboard.writeText(shortUrl);
        setNfcMsg(`${support.guidance} Short NFC link copied.`);
      } catch {
        setNfcMsg(support.guidance);
      }
      return;
    }
    const nav = navigator as Navigator & {
      nfc?: { write: (message: unknown) => Promise<void> };
    };
    try {
      if (nav.nfc) {
        await nav.nfc.write({
          records: [{ recordType: "url", data: shortUrl }],
        });
      } else if ("NDEFReader" in window) {
        // @ts-expect-error Web NFC typings vary by browser
        const reader = new NDEFReader();
        await reader.write({ records: [{ recordType: "url", data: shortUrl }] });
      }
      setNfcMsg("NFC tag written with your SmartCard redirect. Tap phones to open this identity.");
    } catch {
      setNfcMsg("Could not write NFC. Copy the short link and use an NFC writer app.");
    }
  }, [card.nfcEnabled, shortUrl]);

  const submitConnect = useCallback(async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      const res = await fetch("/api/digital-business-cards/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: card.slug,
          visitorName: form.visitorName,
          visitorEmail: form.visitorEmail || null,
          visitorPhone: form.visitorPhone || null,
          note: form.note || null,
          website: form.website || null,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setConnectError(data.error || "Could not connect");
        return;
      }
      setConnectDone(true);
      setConnectOpen(false);
    } catch {
      setConnectError("Network error — try again.");
    } finally {
      setConnecting(false);
    }
  }, [card.slug, form]);

  if (!card.isLive) {
    return (
      <main
        className="min-h-app-viewport flex items-center justify-center px-4"
        style={{ background: theme.stageBackground }}
      >
        <div className="max-w-md rounded-2xl border border-slate-200/80 bg-white/90 p-8 text-center shadow-xl backdrop-blur">
          <p className="font-display text-xl font-semibold text-slate-900">Card unavailable</p>
          <p className="mt-2 text-sm text-slate-600">
            This SmartCard is offline. The owner can renew their plan to keep the identity live.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-app-viewport pb-28" style={{ background: theme.stageBackground }}>
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10 sm:py-14">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.muted }}>
          Sharing as · {modeLabel}
        </p>

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

        {/* Share Center */}
        <section
          className="rounded-2xl border bg-white/85 p-4 shadow-sm backdrop-blur"
          style={{ borderColor: theme.border }}
          aria-label="Share Center"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: theme.muted }}>
              Share Center
            </p>
            <label className="sr-only" htmlFor="share-as">
              Share as
            </label>
            <select
              id="share-as"
              value={shareMode}
              onChange={(e) => setShareMode(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
            >
              {SMARTCARD_PROFILE_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setShowQr((v) => !v)}>
              <QrCode className="mr-1.5 h-4 w-4" />
              {showQr ? "Hide QR" : "Show QR"}
            </Button>
            <Button type="button" variant="outline" className="min-h-11" onClick={writeNfc}>
              <Smartphone className="mr-1.5 h-4 w-4" />
              {nfcSupport.canWrite ? "Write NFC" : "NFC link"}
            </Button>
            <Button type="button" variant="outline" className="min-h-11" onClick={shareCard}>
              <Share2 className="mr-1.5 h-4 w-4" />
              {copied ? "Copied" : "Share link"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => {
                setNfcMsg(
                  "Wallet passes use a Smart QR for universal sharing. Apple Wallet NFC requires Apple entitlements — coming next."
                );
              }}
            >
              <Wallet className="mr-1.5 h-4 w-4" />
              Wallet
            </Button>
          </div>
          {showQr ? (
            <div className="mt-4 flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt={`QR for ${card.displayName}`} className="h-44 w-44 rounded-xl bg-white p-2 shadow" />
              <p className="text-[11px] text-slate-500 break-all text-center">{shortUrl}</p>
            </div>
          ) : null}
          {nfcMsg ? (
            <p className="mt-3 text-center text-[11px] leading-relaxed" style={{ color: theme.muted }}>
              {nfcMsg}
            </p>
          ) : null}
        </section>

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

        {connectDone ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-center">
            <Check className="mx-auto h-6 w-6 text-emerald-600" aria-hidden />
            <p className="mt-2 font-display text-lg font-semibold text-emerald-900">You&apos;re connected</p>
            <p className="mt-1 text-sm text-emerald-800">
              {card.displayName} now has your contact too.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button type="button" onClick={downloadVCard} className="bg-[#0B8A83] hover:bg-[#097a74]">
                <Download className="mr-2 h-4 w-4" />
                Save {card.displayName.split(" ")[0]}
              </Button>
            </div>
          </div>
        ) : null}

        {card.connectBackEnabled && connectOpen && !connectDone ? (
          <form
            className="rounded-2xl border bg-white/90 p-4 shadow-sm space-y-3"
            style={{ borderColor: theme.border }}
            onSubmit={(e) => {
              e.preventDefault();
              void submitConnect();
            }}
          >
            <p className="font-display text-base font-semibold" style={{ color: theme.text }}>
              Connect Back
            </p>
            <p className="text-xs" style={{ color: theme.muted }}>
              Share your details with consent. No Celeventic account required.
            </p>
            <input
              required
              name="visitorName"
              placeholder="Your name"
              value={form.visitorName}
              onChange={(e) => setForm((f) => ({ ...f, visitorName: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <input
              type="email"
              name="visitorEmail"
              placeholder="Email"
              value={form.visitorEmail}
              onChange={(e) => setForm((f) => ({ ...f, visitorEmail: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <input
              name="visitorPhone"
              placeholder="Phone / WhatsApp"
              value={form.visitorPhone}
              onChange={(e) => setForm((f) => ({ ...f, visitorPhone: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
            <textarea
              name="note"
              placeholder="How we met (optional)"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm min-h-[72px]"
            />
            {/* honeypot */}
            <input
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="hidden"
              name="website"
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            />
            {connectError ? <p className="text-xs text-rose-600">{connectError}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={connecting} className="bg-[#0B8A83] hover:bg-[#097a74]">
                {connecting ? "Connecting…" : "Send contact"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setConnectOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        <p className="text-center text-[11px] tracking-wide uppercase" style={{ color: theme.muted }}>
          Celeventic SmartCard
        </p>
      </div>

      {/* Sticky action row */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-lg gap-2">
          <Button type="button" onClick={downloadVCard} className="flex-1 min-h-11 bg-[#0B8A83] hover:bg-[#097a74]">
            <Download className="mr-1.5 h-4 w-4" />
            Save
          </Button>
          {card.connectBackEnabled && !connectDone ? (
            <Button
              type="button"
              variant="outline"
              className="flex-1 min-h-11"
              onClick={() => setConnectOpen(true)}
            >
              <Handshake className="mr-1.5 h-4 w-4" />
              Connect
            </Button>
          ) : null}
          <Button type="button" variant="outline" className="flex-1 min-h-11" onClick={shareCard}>
            <Share2 className="mr-1.5 h-4 w-4" />
            Share
          </Button>
        </div>
      </div>
    </main>
  );
}
