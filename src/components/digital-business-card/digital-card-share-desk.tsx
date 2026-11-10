"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Maximize2,
  Nfc,
  QrCode,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { detectNfcWriteSupport } from "@/lib/digital-business-card/nfc-capability";
import { writeCeleCardNfcUrl } from "@/lib/digital-business-card/nfc-write";
import { buildVCard } from "@/lib/digital-business-card/vcard";
import { digitalCardQrImageSrc, type DigitalCardPublicPayload } from "@/lib/digital-business-card/types";
import { resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import { CeleCardQrBadge } from "@/components/digital-business-card/celecard-qr-badge";
import { SMARTCARD_PRODUCT_NAME } from "@/lib/digital-business-card/product";
import { digitalCardExportImagePath } from "@/lib/digital-business-card/share";
import { getClientAppUrl, sanitizePublicUrl } from "@/lib/app-url";

export function DigitalCardShareDesk({
  profileUrl,
  presentUrl,
  shareUrl,
  nfcUrl,
  displayName,
  vcard,
}: {
  profileUrl: string;
  presentUrl: string;
  shareUrl: string;
  nfcUrl: string;
  displayName: string;
  vcard: DigitalCardPublicPayload;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [nfcMessage, setNfcMessage] = useState<string | null>(null);
  const [nfcBusy, setNfcBusy] = useState(false);
  const nfc = useMemo(() => detectNfcWriteSupport(), []);
  const publicShare = sanitizePublicUrl(shareUrl || profileUrl, getClientAppUrl());
  const publicNfc = sanitizePublicUrl(nfcUrl || shareUrl || profileUrl, getClientAppUrl());
  const qrPng = publicShare.startsWith("http") ? digitalCardQrImageSrc(publicShare, { size: 1024, format: "png" }) : "";
  const qrPngHi = publicShare.startsWith("http")
    ? digitalCardQrImageSrc(publicShare, { size: 2048, format: "png", download: true })
    : "";
  const qrSvg = publicShare.startsWith("http")
    ? digitalCardQrImageSrc(publicShare, { size: 1024, format: "svg", download: true })
    : "";
  const qrSvgClear = publicShare.startsWith("http")
    ? digitalCardQrImageSrc(publicShare, { size: 1024, format: "svg", download: true, background: "transparent" })
    : "";
  const qrBranded = publicShare.startsWith("http")
    ? digitalCardQrImageSrc(publicShare, { size: 2048, format: "png", download: true, variant: "brand" })
    : "";
  const cardPng = vcard.slug ? digitalCardExportImagePath(vcard.slug) : "";

  async function copy(label: string, value: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1800);
  }

  async function nativeShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: displayName,
          text: `${displayName} · ${SMARTCARD_PRODUCT_NAME}`,
          url: publicShare,
        });
        return;
      }
    } catch {
      /* fall through */
    }
    await copy("share", publicShare);
  }

  function saveContact() {
    const blob = new Blob([buildVCard(vcard)], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${vcard.slug || "celecard"}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function writeTag() {
    setNfcBusy(true);
    setNfcMessage(null);
    const result = await writeCeleCardNfcUrl(publicNfc);
    setNfcBusy(false);
    setNfcMessage(result.ok ? "Tag written. The tag opens this CeleYou." : result.reason);
  }

  const ready = Boolean(publicShare);

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-900">Show and share</p>
      <p className="text-xs text-slate-600">
        Fill the phone with your card, or send the same link, QR, and NFC destination.
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        <Button asChild variant="outline" size="sm" disabled={!ready}>
          <Link href={presentUrl}>
            <CreditCard className="mr-2 h-4 w-4" />
            Show my card
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" disabled={!ready}>
          <Link href={`${presentUrl}${presentUrl.includes("?") ? "&" : "?"}immersive=1`}>
            <Maximize2 className="mr-2 h-4 w-4" />
            Immersive
          </Link>
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!ready} onClick={() => void copy("link", publicShare)}>
          {copied === "link" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied === "link" ? "Copied" : "Copy link"}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!ready} onClick={() => void nativeShare()}>
          <Share2 className="mr-2 h-4 w-4" />
          {copied === "share" ? "Copied" : "Share"}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!ready} onClick={() => setShowQr((value) => !value)}>
          <QrCode className="mr-2 h-4 w-4" />
          {showQr ? "Hide QR" : "Show QR"}
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={profileUrl} target="_blank">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open profile
          </Link>
        </Button>
      </div>
      {showQr && qrPng ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <CeleCardQrBadge
            qrSrc={qrPng}
            theme={resolveDigitalCardTheme(vcard.themeId)}
            avatarUrl={vcard.avatarUrl}
            displayName={displayName}
            sizeClass="h-52 w-52"
            padClass="p-0"
          />
          <div className="flex flex-wrap justify-center gap-2">
            <a href={qrPngHi} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0B8A83]">
              <Download className="mr-1 inline h-3 w-3" />
              PNG
            </a>
            <a href={qrSvg} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0B8A83]">
              <Download className="mr-1 inline h-3 w-3" />
              SVG
            </a>
            <a href={qrSvgClear} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0B8A83]">
              <Download className="mr-1 inline h-3 w-3" />
              Transparent
            </a>
            <a href={qrBranded} className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0B8A83]">
              <Download className="mr-1 inline h-3 w-3" />
              Branded
            </a>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={saveContact}>
          <Download className="mr-2 h-4 w-4" />
          Save contact
        </Button>
        {qrPngHi ? (
          <Button asChild variant="ghost" size="sm">
            <a href={qrPngHi}>
              <Download className="mr-2 h-4 w-4" />
              Download QR
            </a>
          </Button>
        ) : null}
        {cardPng ? (
          <Button asChild variant="ghost" size="sm">
            <a href={cardPng}>
              <Download className="mr-2 h-4 w-4" />
              Download card
            </a>
          </Button>
        ) : null}
      </div>
      <div className="rounded-xl border border-slate-200 p-3">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <Nfc className="h-3.5 w-3.5" />
          NFC
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{nfc.guidance}</p>
        {nfc.canWrite ? (
          <button
            type="button"
            disabled={nfcBusy || !ready}
            onClick={() => void writeTag()}
            className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0B8A83]"
          >
            Write tag
          </button>
        ) : (
          <button
            type="button"
            className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0B8A83]"
            onClick={() => void copy("nfc", publicNfc)}
          >
            {copied === "nfc" ? "Copied NFC link" : "Copy NFC link"}
          </button>
        )}
        {nfcMessage ? <p className="mt-2 text-xs text-slate-700">{nfcMessage}</p> : null}
      </div>
    </div>
  );
}
