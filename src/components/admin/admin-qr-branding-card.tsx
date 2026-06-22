"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode } from "lucide-react";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { CROP_PRESETS } from "@/lib/image/crop-utils";

export function AdminQrBrandingCard() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/qr-branding")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setUrl(d.data.url);
      });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <QrCode className="h-4 w-4" />
          Default QR Center Logo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">
          Platform fallback when events have no custom QR logo. Used on invitations, tickets, and admission passes.
        </p>
        <ImageUploadCropper
          defaultAspect="1:1"
          allowedAspects={CROP_PRESETS.logo}
          buttonLabel="Upload Celeventic fallback"
          hint="Import logo from device — crop to square for QR center."
          previewUrl={url}
          onClear={() => setUrl(null)}
          onCustomUpload={async (blob, name) => {
            const fd = new FormData();
            fd.append("file", new File([blob], name, { type: blob.type || "image/jpeg" }));
            const res = await fetch("/api/admin/qr-branding", { method: "PUT", body: fd });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error || "Upload failed");
            setUrl(d.data.url);
            return { url: d.data.url, name };
          }}
          onUploaded={(r) => setUrl(r.url)}
        />
      </CardContent>
    </Card>
  );
}
