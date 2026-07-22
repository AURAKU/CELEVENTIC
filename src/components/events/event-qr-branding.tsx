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

interface EventQrBrandingProps {
  eventId: string;
  initialUrl?: string | null;
}

export function EventQrBranding({ eventId, initialUrl }: EventQrBrandingProps) {
  const [url, setUrl] = useState(initialUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function uploadCropped(blob: Blob, name: string) {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      // Compress before upload so any source size is accepted. The QR renders the
      // logo at ~342px max, so the 1024px cap is invisible in the output.
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <QrCode className="h-4 w-4 text-brand-600" />
          QR Center Logo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">
          Upload any image, at any size — it is optimised automatically. Crop freely to any
          shape or region; square reads best in the QR centre.
        </p>

        {url && (
          <div className="relative h-20 w-20 rounded-xl border bg-white overflow-hidden">
            <UploadedMedia src={url} alt="QR center logo" fill className="object-contain p-1" />
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

        <p className="text-xs text-slate-400">
          JPEG, PNG, WebP or GIF · any file size · transparency preserved
        </p>
      </CardContent>
    </Card>
  );
}
