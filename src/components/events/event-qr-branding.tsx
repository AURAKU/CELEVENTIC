"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { UploadedMedia } from "@/components/media/uploaded-media";
import { CROP_PRESETS } from "@/lib/image/crop-utils";

interface EventQrBrandingProps {
  eventId: string;
  initialUrl?: string | null;
}

export function EventQrBranding({ eventId, initialUrl }: EventQrBrandingProps) {
  const [url, setUrl] = useState(initialUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function uploadCropped(blob: Blob, name: string) {
    setLoading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", new File([blob], name, { type: blob.type || "image/png" }));
    const res = await fetch(`/api/events/${eventId}/qr-center-image`, { method: "POST", body: fd });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setUrl(data.data.url);
      return { url: data.data.url, name };
    }
    setError(data.error ?? "Upload failed");
    throw new Error(data.error);
  }

  async function remove() {
    setLoading(true);
    const res = await fetch(`/api/events/${eventId}/qr-center-image`, { method: "DELETE" });
    if (res.ok) setUrl(null);
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
          Upload and crop your event logo for branded QR codes. Square crop recommended.
        </p>

        {url && (
          <div className="relative h-20 w-20 rounded-xl border bg-white overflow-hidden">
            <UploadedMedia src={url} alt="QR center logo" fill className="object-contain p-1" />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <ImageUploadCropper
          defaultAspect="1:1"
          allowedAspects={CROP_PRESETS.logo}
          previewUrl={url}
          onClear={() => void remove()}
          disabled={loading}
          buttonLabel={url ? "Replace logo" : "Upload & crop logo"}
          hint="Import from device, then crop to square for QR center."
          onCustomUpload={uploadCropped}
          onUploaded={(r) => setUrl(r.url)}
          onError={setError}
        />

        <p className="text-xs text-slate-400">JPEG, PNG, or WebP · max 2MB</p>
      </CardContent>
    </Card>
  );
}
