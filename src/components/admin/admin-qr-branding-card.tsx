"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode } from "lucide-react";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { CROP_PRESETS } from "@/lib/image/crop-utils";
import {
  smartCompressImage,
  extensionForBlob,
  formatBytes,
  QR_LOGO_COMPRESSION,
} from "@/lib/image/smart-compress";
import { QrLogoSizeControl } from "@/components/qr/qr-logo-size-control";
import {
  QR_DEFAULT_LOGO_SIZE,
  parseQrLogoSize,
  type QrLogoSizePreset,
} from "@/lib/qr/qr-constants";

export function AdminQrBrandingCard() {
  const [url, setUrl] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState<QrLogoSizePreset>(QR_DEFAULT_LOGO_SIZE);
  const [savingSize, setSavingSize] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/qr-branding")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setUrl(d.data.url);
          setLogoSize(parseQrLogoSize(d.data.logoSize));
        }
      });
  }, []);

  async function saveLogoSize(next: QrLogoSizePreset) {
    setLogoSize(next);
    setSavingSize(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/qr-branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoSize: next }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not save logo size");
      setLogoSize(parseQrLogoSize(d.data.logoSize));
      setNotice(`Logo size set to ${next}. New QRs use this size.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save logo size");
    } finally {
      setSavingSize(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <QrCode className="h-4 w-4" />
          Default QR Center Logo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          Platform fallback when events have no custom QR logo. Used on invitations, tickets, and admission passes.
          Upload any size — it is optimised automatically.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-emerald-700">{notice}</p>}
        <ImageUploadCropper
          defaultAspect="free"
          allowedAspects={CROP_PRESETS.all}
          buttonLabel="Upload Celeventic fallback"
          hint="Import logo from device — crop any part of the image."
          maxFileBytes={Infinity}
          dropzoneNote="or drag & drop · JPEG, PNG, WebP, GIF · any size"
          previewUrl={url}
          onClear={() => setUrl(null)}
          onError={setError}
          onCustomUpload={async (blob, name) => {
            setError("");
            setNotice("");
            const result = await smartCompressImage(blob, QR_LOGO_COMPRESSION);
            const finalName = name.replace(/\.[^.]+$/, "") + "." + extensionForBlob(result.blob);

            const fd = new FormData();
            fd.append("file", new File([result.blob], finalName, { type: result.blob.type }));
            fd.append("logoSize", logoSize);
            const res = await fetch("/api/admin/qr-branding", { method: "PUT", body: fd });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || "Upload failed");
            setUrl(d.data.url);
            if (d.data.logoSize) setLogoSize(parseQrLogoSize(d.data.logoSize));
            if (!result.untouched) {
              setNotice(
                `Optimised ${formatBytes(result.originalBytes)} → ${formatBytes(result.blob.size)} ` +
                  `at ${result.width}×${result.height}${result.hasAlpha ? " · transparency kept" : ""}`
              );
            }
            return { url: d.data.url, name: finalName };
          }}
          onUploaded={(r) => setUrl(r.url)}
        />

        <QrLogoSizeControl value={logoSize} onChange={(v) => void saveLogoSize(v)} disabled={savingSize} />
      </CardContent>
    </Card>
  );
}
