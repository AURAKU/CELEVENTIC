"use client";

import { useEffect, useState } from "react";
import { BrandedQrImage } from "@/components/qr/branded-qr-image";
import { buildVerifyUrl } from "@/lib/qr/parse-qr-payload";

interface QrBlockProps {
  value: string;
  size: number;
  className?: string;
  eventId?: string;
  token?: string;
}

export function QrBlock({ value, size, className, eventId, token }: QrBlockProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setSrc(null);
      return;
    }

    if (token) {
      setSrc(`/api/qr/image?token=${encodeURIComponent(token)}`);
      return;
    }

    const params = new URLSearchParams();
    params.set("data", value.startsWith("http") ? value : buildVerifyUrl(value));
    if (eventId) params.set("eventId", eventId);
    setSrc(`/api/qr/image?${params.toString()}`);
  }, [value, eventId, token]);

  if (!src) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          background: "#fff",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          color: "#64748b",
        }}
      >
        QR
      </div>
    );
  }

  return (
    <BrandedQrImage
      src={src}
      size={size}
      token={token}
      showDownload={false}
      className={className}
    />
  );
}
