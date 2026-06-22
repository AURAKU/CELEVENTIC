"use client";

import { useState } from "react";
import { X, Images } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { CROP_PRESETS } from "@/lib/image/crop-utils";

interface GalleryUploadPanelProps {
  urls: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export function GalleryUploadPanel({
  urls,
  onChange,
  maxImages = 30,
  disabled,
}: GalleryUploadPanelProps) {
  const [error, setError] = useState("");

  function addUrl(url: string) {
    if (urls.length >= maxImages) {
      setError(`Maximum ${maxImages} photos.`);
      return;
    }
    if (urls.includes(url)) return;
    onChange([...urls, url]);
    setError("");
  }

  function removeAt(index: number) {
    onChange(urls.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Images className="h-4 w-4 text-brand-600" />
        <Label className="text-base font-semibold">Event gallery</Label>
      </div>
      <p className="text-xs text-slate-500">
        Upload from your device — crop each photo to the frame you want on the invitation.
      </p>

      {urls.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {urls.map((url, i) => (
            <div key={`${url}-${i}`} className="relative aspect-square rounded-xl overflow-hidden border bg-slate-100 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute top-1 right-1 h-7 w-7 opacity-90"
                onClick={() => removeAt(i)}
                disabled={disabled}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {urls.length < maxImages && (
        <ImageUploadCropper
          defaultAspect="4:5"
          allowedAspects={CROP_PRESETS.gallery}
          extraFormFields={{ role: "gallery", buildMode: "template" }}
          onUploaded={(r) => addUrl(r.url)}
          onError={setError}
          disabled={disabled}
          buttonLabel={urls.length === 0 ? "Upload gallery media" : "Add gallery media"}
          hint="Import a photo, then crop to your preferred size or frame."
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-slate-400">{urls.length} / {maxImages} photos</p>
    </div>
  );
}
