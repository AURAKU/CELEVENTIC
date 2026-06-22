"use client";

import { useState } from "react";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { MediaUploadVideo } from "@/components/media/media-upload-video";
import { uploadFormDataWithProgress } from "@/lib/media/upload-with-progress";
import { CROP_PRESETS } from "@/lib/image/crop-utils";

interface VendorPortfolioUploadProps {
  onUploaded?: () => void;
  disabled?: boolean;
}

export function VendorPortfolioUpload({ onUploaded, disabled }: VendorPortfolioUploadProps) {
  const [error, setError] = useState("");

  async function uploadPortfolioImage(blob: Blob, fileName: string) {
    const fd = new FormData();
    fd.append("file", new File([blob], fileName, { type: blob.type || "image/jpeg" }));
    const { ok, json } = await uploadFormDataWithProgress("/api/vendor-os/media/upload", fd);
    if (!ok) throw new Error((json.error as string) || "Upload failed");
    onUploaded?.();
    const data = json.data as { url: string };
    return { url: data.url, name: fileName };
  }

  return (
    <div className="space-y-4">
      <ImageUploadCropper
        defaultAspect="4:5"
        allowedAspects={CROP_PRESETS.gallery}
        onCustomUpload={uploadPortfolioImage}
        onUploaded={() => onUploaded?.()}
        onError={setError}
        disabled={disabled}
        buttonLabel="Upload portfolio image"
        hint="Add a portfolio photo — crop to showcase your best work."
      />
      <MediaUploadVideo
        uploadEndpoint="/api/vendor-os/media/upload"
        maxVideoBytes={25 * 1024 * 1024}
        onUploaded={() => onUploaded?.()}
        onError={setError}
        disabled={disabled}
        buttonLabel="Upload portfolio video"
        hint="Add a portfolio video reel (MP4 or WebM)."
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
