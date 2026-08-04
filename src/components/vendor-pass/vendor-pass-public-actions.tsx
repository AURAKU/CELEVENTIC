"use client";

import { useState } from "react";
import { Download, Link2, Mail, MessageCircle, Printer } from "lucide-react";

export function VendorPassPublicActions({
  title,
  vendorName,
  eventTitle,
  admissionCode,
  publicToken,
}: {
  title: string;
  vendorName: string;
  eventTitle?: string | null;
  admissionCode: string;
  publicToken: string;
}) {
  const [copied, setCopied] = useState(false);

  const shareText = `${title}\n${vendorName}\nAccess code ${admissionCode}\n${typeof window !== "undefined" ? window.location.href : ""}`;
  const mailBody = `Your Celeventic vendor access pass for ${eventTitle ?? "the event"}.\n\nPass: ${title}\nVendor: ${vendorName}\nAccess code: ${admissionCode}\n\nOpen your pass: ${typeof window !== "undefined" ? window.location.href : ""}`;

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
      <a
        className={btn}
        href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
        target="_blank"
        rel="noreferrer"
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        WhatsApp
      </a>
      <button type="button" className={btn} onClick={() => void copyLink()}>
        <Link2 className="h-4 w-4" aria-hidden />
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
