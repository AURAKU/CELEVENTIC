"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { VideoUploader, type UploadedVideoResult } from "@/components/media/video-uploader";
import { uploadFormDataWithProgress } from "@/lib/media/upload-with-progress";
import { CROP_PRESETS } from "@/lib/image/crop-utils";

interface TemplateMediaUploadProps {
  label: string;
  category: string;
  accept?: string;
  onUploaded: (url: string) => void;
  previewUrl?: string | null;
  onClear?: () => void;
}

export function TemplateMediaUpload({
  label,
  category,
  accept = "video/*",
  onUploaded,
  previewUrl,
  onClear,
}: TemplateMediaUploadProps) {
  const [error, setError] = useState("");
  const isImage = accept.includes("image");

  async function uploadBlob(blob: Blob, fileName: string) {
    const fd = new FormData();
    fd.append("file", new File([blob], fileName, { type: blob.type || "image/jpeg" }));
    fd.append("category", category);
    const { ok, json } = await uploadFormDataWithProgress("/api/admin/invitation-templates/upload", fd);
    if (!ok) throw new Error((json.error as string) || "Upload failed");
    const data = json.data as { url: string };
    onUploaded(data.url);
    return { url: data.url, name: fileName };
  }

  if (isImage) {
    return (
      <div>
        <Label className="text-xs">{label}</Label>
        <ImageUploadCropper
          className="mt-1"
          defaultAspect="free"
          allowedAspects={CROP_PRESETS.cover}
          onCustomUpload={uploadBlob}
          onUploaded={(r) => onUploaded(r.url)}
          onError={setError}
          buttonLabel="Upload image"
          hint="Upload and crop template artwork."
          previewUrl={previewUrl ?? null}
          onClear={onClear}
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
    );
  }

  function onVideoUploaded(result: UploadedVideoResult) {
    if (result.processedMp4Url) onUploaded(result.processedMp4Url);
  }

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <VideoUploader
        className="mt-1"
        category="ADMIN"
        role={category}
        previewUrl={previewUrl ?? null}
        onClear={onClear}
        onUploaded={onVideoUploaded}
        onError={setError}
        buttonLabel="Upload video"
        hint="Upload template preview, background, or motion reference — up to 5GB, processed automatically."
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
