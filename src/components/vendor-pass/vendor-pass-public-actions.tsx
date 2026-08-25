"use client";

import { useState } from "react";
import { Download, Link2, Mail, Printer } from "lucide-react";
import { ensureSingleShareUrl, openWhatsAppShare } from "@/lib/invitation/whatsapp-share";

/** Official-style WhatsApp glyph so share actions are instantly recognizable. */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function VendorPassPublicActions({
  title,
  vendorName,
  eventTitle,
  publicToken,
}: {
  title: string;
  vendorName: string;
  eventTitle?: string | null;
  /** Kept for call-site compatibility; code stays on the security band, not in shares. */
  admissionCode?: string;
  publicToken: string;
}) {
  const [copied, setCopied] = useState(false);

  const pageUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `/vendor-pass/${encodeURIComponent(publicToken)}`;
  const shareText = ensureSingleShareUrl(
    `${title}\n${vendorName}\nOpen your pass:`,
    pageUrl
  );
  const mailBody = `Your Celeventic vendor access pass for ${eventTitle ?? "the event"}.\n\nPass: ${title}\nVendor: ${vendorName}\n\nOpen your pass: ${pageUrl}`;

  const cardDownloadHref = `/api/vendor-pass/qr-image?${new URLSearchParams({
    publicToken,
    kind: "card",
    download: "1",
  }).toString()}`;

  const qrDownloadHref = `/api/vendor-pass/qr-image?${new URLSearchParams({
    publicToken,
    kind: "qr",
    mode: "brand",
    size: "1024",
    download: "1",
  }).toString()}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  const btn =
    "inline-flex h-10 items-center gap-2 rounded-xl border border-brand-200/80 bg-white px-3.5 text-sm font-semibold text-brand-800 shadow-sm transition-colors hover:bg-brand-50";

  return (
    <div className="mb-5 flex flex-wrap gap-2 print:hidden">
      <a className={btn} href={cardDownloadHref} download>
        <Download className="h-4 w-4" aria-hidden />
        Download access card
      </a>
      <a className={btn} href={qrDownloadHref} download>
        <Download className="h-4 w-4" aria-hidden />
        Download QR
      </a>
      <button type="button" className={btn} onClick={() => window.print()}>
        <Printer className="h-4 w-4" aria-hidden />
        Print / PDF
      </button>
      <a
        className={btn}
        href={`mailto:?subject=${encodeURIComponent(`${title} · Celeventic Vendor Pass`)}&body=${encodeURIComponent(mailBody)}`}
      >
        <Mail className="h-4 w-4" aria-hidden />
        Email
      </a>
      <button
        type="button"
        className={btn}
        onClick={(event) => {
          event.preventDefault();
          openWhatsAppShare(shareText);
        }}
      >
        <WhatsAppIcon className="h-4 w-4" />
        WhatsApp
      </button>
      <button type="button" className={btn} onClick={() => void copyLink()}>
        <Link2 className="h-4 w-4" aria-hidden />
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
