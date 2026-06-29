"use client";

import { Gift } from "lucide-react";
import { BrandedQrImage } from "@/components/qr/branded-qr-image";

interface GiftQrBoxProps {
  qrDataUrl?: string | null;
  qrToken?: string | null;
  registryUrl?: string | null;
  accentColor?: string;
  caption?: string;
  variant?: "light" | "dark";
}

export function GiftQrBox({
  qrDataUrl,
  qrToken,
  registryUrl,
  accentColor = "#D4A63A",
  caption = "Scan for gift registry & contributions",
  variant = "light",
}: GiftQrBoxProps) {
  if (!qrDataUrl && !registryUrl) return null;

  const dark = variant === "dark";

  return (
    <div className="inv-3d-scene max-w-xs mx-auto">
      <div
        className="inv-3d-gift-box rounded-2xl p-6 text-center border-2 shadow-xl"
        style={{
          borderColor: `${accentColor}66`,
          background: dark
            ? "linear-gradient(145deg, rgba(15,23,42,0.85) 0%, rgba(30,41,59,0.9) 100%)"
            : "linear-gradient(145deg, #fffef9 0%, #fef3c7 100%)",
        }}
      >
        <div
          className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3"
          style={{ background: `${accentColor}22`, color: accentColor }}
        >
          <Gift className="h-6 w-6" />
        </div>
        <h3 className={`font-display font-bold mb-1 ${dark ? "text-white" : "text-slate-900"}`}>Gift & Contributions</h3>
        <p className={`text-xs mb-4 ${dark ? "text-white/65" : "text-slate-600"}`}>{caption}</p>
        {qrDataUrl && (
          <div className="rounded-xl bg-white p-3 shadow-inner inline-block">
            <BrandedQrImage src={qrDataUrl} token={qrToken ?? undefined} size={140} showDownload={false} />
          </div>
        )}
        {registryUrl && (
          <a
            href={registryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm font-semibold underline"
            style={{ color: accentColor }}
          >
            Open gift registry
          </a>
        )}
      </div>
    </div>
  );
}
