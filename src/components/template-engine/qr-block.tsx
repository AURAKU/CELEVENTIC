"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface QrBlockProps {
  value: string;
  size: number;
  className?: string;
}

export function QrBlock({ value, size, className }: QrBlockProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const payload = value || "https://celeventic.com";
    QRCode.toDataURL(payload, { width: size, margin: 1, color: { dark: "#1e293b", light: "#ffffff" } })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className={className}
        style={{ width: size, height: size, background: "#fff", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#64748b" }}
      >
        QR
      </div>
    );
  }

  return <img src={dataUrl} alt="QR Code" width={size} height={size} className={className} style={{ borderRadius: 4 }} />;
}
