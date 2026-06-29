"use client";

import { useEffect, useState } from "react";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { uploadFormDataWithProgress } from "@/lib/media/upload-with-progress";
import { CROP_PRESETS } from "@/lib/image/crop-utils";

interface VendorProfilePhotoUploadProps {
  profileImage?: string | null;
  onUpdated: (url: string | null) => void;
  disabled?: boolean;
}

export function VendorProfilePhotoUpload({ profileImage, onUpdated, disabled }: VendorProfilePhotoUploadProps) {
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(profileImage ?? null);

  useEffect(() => {
    setPreview(profileImage ?? null);
  }, [profileImage]);

  async function uploadProfilePhoto(blob: Blob, fileName: string) {
    const fd = new FormData();
    fd.append("file", new File([blob], fileName, { type: blob.type || "image/jpeg" }));
    const { ok, json } = await uploadFormDataWithProgress("/api/vendor-os/profile-image", fd);
    if (!ok) throw new Error((json.error as string) || "Upload failed");
    const data = json.data as { url: string };
    setPreview(data.url);
    onUpdated(data.url);
    return { url: data.url, name: fileName };
  }

  async function removePhoto() {
    setError("");
    const res = await fetch("/api/vendor-os/profile-image", { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      setError((json.error as string) || "Could not remove photo");
      return;
    }
    setPreview(null);
    onUpdated(null);
  }

  return (
    <div className="space-y-2">
      <ImageUploadCropper
        defaultAspect="1:1"
        allowedAspects={CROP_PRESETS.logo}
        previewUrl={preview}
        onCustomUpload={uploadProfilePhoto}
        onUploaded={() => {}}
        onClear={() => void removePhoto()}
        onError={setError}
        disabled={disabled}
        buttonLabel="Upload profile photo"
        hint="Add a profile photo — shown on your marketplace listing and public page."
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
