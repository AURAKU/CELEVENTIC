"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { UploadedMedia } from "@/components/media/uploaded-media";
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

interface EventQrBrandingProps {
  eventId: string;
  initialUrl?: string | null;
  initialLogoSize?: string | null;
}

export function EventQrBranding({
  eventId,
  initialUrl,
  initialLogoSize,
}: EventQrBrandingProps) {
  const [url, setUrl] = useState(initialUrl ?? null);
  const [logoSize, setLogoSize] = useState<QrLogoSizePreset>(
    parseQrLogoSize(initialLogoSize ?? QR_DEFAULT_LOGO_SIZE)
  );
  const [loading, setLoading] = useState(false);
  const [savingSize, setSavingSize] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function uploadCropped(blob: Blob, name: string) {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      // Compress before upload so any source size is accepted. The QR renders the
      // logo at ~405px max (bold @ 2048), so the 1024px cap is invisible in output.
      const result = await smartCompressImage(blob, QR_LOGO_COMPRESSION);
      const finalName = name.replace(/\.[^.]+$/, "") + "." + extensionForBlob(result.blob);

      const fd = new FormData();
      fd.append("file", new File([result.blob], finalName, { type: result.blob.type }));
      const res = await fetch(`/api/events/${eventId}/qr-center-image`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        const message = (data?.error as string) ?? "Upload failed";
        setError(message);
        throw new Error(message);
      }

      setUrl(data.data.url);
      if (!result.untouched) {
        setNotice(
          `Optimised ${formatBytes(result.originalBytes)} → ${formatBytes(result.blob.size)} ` +
            `at ${result.width}×${result.height}${result.hasAlpha ? " · transparency kept" : ""}`
        );
      }
      return { url: data.data.url, name: finalName };
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    setLoading(true);
    const res = await fetch(`/api/events/${eventId}/qr-center-image`, { method: "DELETE" });
    if (res.ok) {
      setUrl(null);
      setNotice("");
      setError("");
    }
    setLoading(false);
  }

  async function saveLogoSize(next: QrLogoSizePreset) {
    setLogoSize(next);
    setSavingSize(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/events/${eventId}/qr-center-image`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoSize: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save logo size");
      setLogoSize(parseQrLogoSize(data.data.logoSize));
      setNotice(`Logo size set to ${next}. Invitation & admission QRs update on next render.`);
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
          <QrCode className="h-4 w-4 text-brand-600" />
          QR Center Logo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">
          Upload any image, at any size — it is optimised automatically. The full mark is shown inside
          the QR white inset (never cropped). Square reads best; wide or tall logos letterbox with padding.
        </p>

        {url && (
          <div className="relative flex h-20 w-20 items-center justify-center rounded-xl border bg-white p-1.5 overflow-hidden">
            {/* object-contain — full uploaded mark, never cropped in the preview tile */}
            <UploadedMedia
              src={url}
              alt="QR center logo"
              width={72}
              height={72}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm text-emerald-700">{notice}</p>}

        <ImageUploadCropper
          defaultAspect="free"
          allowedAspects={CROP_PRESETS.all}
          previewUrl={url}
          onClear={() => void remove()}
          disabled={loading}
          buttonLabel={url ? "Replace logo" : "Upload & crop logo"}
          hint="Import from device, then crop any part of the image."
          maxFileBytes={Infinity}
          dropzoneNote="or drag & drop · JPEG, PNG, WebP, GIF · any size"
          onCustomUpload={uploadCropped}
          onUploaded={(r) => setUrl(r.url)}
          onError={setError}
        />

        <QrLogoSizeControl
          value={logoSize}
          onChange={(v) => void saveLogoSize(v)}
          disabled={loading || savingSize}
        />

        <p className="text-xs text-slate-400">
          JPEG, PNG, WebP or GIF · any file size · transparency preserved
        </p>
      </CardContent>
    </Card>
  );
}
