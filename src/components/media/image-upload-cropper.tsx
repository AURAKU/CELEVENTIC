"use client";

import { useRef, useState } from "react";
import { Upload, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageCropDialog } from "@/components/media/image-crop-dialog";
import type { CropAspectPreset } from "@/lib/image/crop-utils";
import { readImageDimensions } from "@/lib/image/crop-utils";
import { extractImagePalette } from "@/lib/extract-image-palette";
import {
  uploadFormDataWithProgress,
  validateClientImage,
} from "@/lib/media/upload-with-progress";

export interface UploadedImageResult {
  url: string;
  name: string;
}

interface ImageUploadCropperProps {
  label?: string;
  hint?: string;
  defaultAspect?: CropAspectPreset;
  allowedAspects?: CropAspectPreset[];
  uploadEndpoint?: string;
  extraFormFields?: Record<string, string>;
  onUploaded: (result: UploadedImageResult) => void;
  /** Custom upload handler (e.g. event QR logo) — skips default endpoint */
  onCustomUpload?: (blob: Blob, fileName: string) => Promise<UploadedImageResult>;
  onError?: (message: string) => void;
  disabled?: boolean;
  className?: string;
  previewUrl?: string | null;
  onClear?: () => void;
  buttonLabel?: string;
}

export function ImageUploadCropper({
  label,
  hint = "Upload from your device — crop and frame before saving.",
  defaultAspect = "4:5",
  allowedAspects,
  uploadEndpoint = "/api/invitations/upload",
  extraFormFields,
  onUploaded,
  onCustomUpload,
  onError,
  disabled,
  className,
  previewUrl,
  onClear,
  buttonLabel = "Upload image",
}: ImageUploadCropperProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState("image.jpg");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  async function pickFile(file: File) {
    const err = validateClientImage(file);
    if (err) {
      onError?.(err);
      return;
    }
    try {
      const { url } = await readImageDimensions(file);
      setPendingName(file.name);
      setCropSrc(url);
    } catch {
      onError?.("Could not read image.");
    }
  }

  async function handleCropConfirm(blob: Blob, name: string) {
    setUploading(true);
    setProgress(0);
    try {
      const result = onCustomUpload
        ? await onCustomUpload(blob, name)
        : await uploadBlobInternal(blob, name, setProgress);
      onUploaded(result);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
      if (cropSrc?.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    }
  }

  async function uploadBlobInternal(
    blob: Blob,
    name: string,
    onProg?: (n: number) => void
  ): Promise<UploadedImageResult> {
    const preview = URL.createObjectURL(blob);
    let paletteFields: Record<string, string> = {};
    try {
      const palette = await extractImagePalette(preview);
      paletteFields = {
        colors: JSON.stringify(palette.colors),
        brightness: String(palette.brightness),
        aspectRatio: String(palette.aspectRatio),
      };
    } catch {
      // optional
    }
    URL.revokeObjectURL(preview);

    const fd = new FormData();
    fd.append("file", new File([blob], name, { type: blob.type || "image/jpeg" }));
    fd.append("role", extraFormFields?.role ?? "hero");
    Object.entries({ ...extraFormFields, ...paletteFields }).forEach(([k, v]) => fd.append(k, v));

    const { ok, json } = await uploadFormDataWithProgress(uploadEndpoint, fd, onProg);
    if (!ok) {
      throw new Error((json.error as string) || "Upload failed");
    }
    const data = json.data as { url: string; name?: string };
    return { url: data.url, name: data.name ?? name };
  }

  return (
    <div className={cn("space-y-3", className)}>
      {label && <p className="text-sm font-medium text-slate-900">{label}</p>}

      {previewUrl ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-xl border bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt=""
              loading="lazy"
              className="h-16 w-16 rounded-lg object-cover border"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">Image ready</p>
              <p className="text-xs text-slate-500">Cropped and saved</p>
            </div>
            {onClear && (
              <Button type="button" size="icon" variant="ghost" onClick={onClear}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-2"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Replace image
          </Button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void pickFile(file);
          }}
          className={cn(
            "rounded-xl border-2 border-dashed p-5 text-center transition-colors",
            dragOver ? "border-brand-500 bg-brand-50/50" : "border-slate-200 bg-slate-50/50",
            disabled && "opacity-50 pointer-events-none"
          )}
        >
          <ImagePlus className="h-8 w-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm text-slate-600 mb-3">{hint}</p>
          <Button
            type="button"
            variant="outline"
            className="gap-2 min-h-[44px] touch-manipulation"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? `Uploading ${progress}%` : buttonLabel}
          </Button>
          <p className="text-[11px] text-slate-400 mt-2">or drag & drop · JPEG, PNG, WebP · max 10MB</p>
          {uploading && (
            <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,.jfif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pickFile(f);
          e.target.value = "";
        }}
      />

      {cropSrc && (
        <ImageCropDialog
          open
          imageSrc={cropSrc}
          fileName={pendingName}
          defaultAspect={defaultAspect}
          allowedAspects={allowedAspects}
          onClose={() => {
            if (cropSrc.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
