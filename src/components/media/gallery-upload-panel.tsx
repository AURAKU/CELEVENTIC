"use client";

import { useRef, useState } from "react";
import { X, Images, Film, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { UploadedMedia } from "@/components/media/uploaded-media";
import { CROP_PRESETS } from "@/lib/image/crop-utils";
import { uploadFormDataWithProgress, validateClientVideo } from "@/lib/media/upload-with-progress";

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
  const [videoUploading, setVideoUploading] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

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

  async function uploadVideo(file: File) {
    const err = validateClientVideo(file);
    if (err) {
      setError(err);
      return;
    }
    if (urls.length >= maxImages) {
      setError(`Maximum ${maxImages} items.`);
      return;
    }
    setVideoUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("role", "gallery");
      fd.append("buildMode", "template");
      const { ok, json } = await uploadFormDataWithProgress("/api/invitations/upload", fd);
      if (!ok) throw new Error((json.error as string) || "Video upload failed");
      const data = json.data as { url: string };
      addUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Video upload failed");
    } finally {
      setVideoUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Images className="h-4 w-4 text-brand-600" />
        <Label className="text-base font-semibold">Event gallery</Label>
      </div>
      <p className="text-xs text-slate-500">
        Upload photos or videos from your device — crop each photo to the frame you want on the invitation.
      </p>

      {urls.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {urls.map((url, i) => (
            <div key={`${url}-${i}`} className="relative aspect-square rounded-xl overflow-hidden border bg-slate-100 group">
              <UploadedMedia src={url} alt="" className="w-full h-full object-cover" />
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
        <div className="flex flex-col sm:flex-row gap-2">
          <ImageUploadCropper
            defaultAspect="4:5"
            allowedAspects={CROP_PRESETS.gallery}
            extraFormFields={{ role: "gallery", buildMode: "template" }}
            onUploaded={(r) => addUrl(r.url)}
            onError={setError}
            disabled={disabled}
            buttonLabel={urls.length === 0 ? "Upload gallery photo" : "Add photo"}
            hint="Import a photo, then crop to your preferred size or frame."
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2 min-h-[44px] shrink-0"
            disabled={disabled || videoUploading}
            onClick={() => videoInputRef.current?.click()}
          >
            {videoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
            {videoUploading ? "Uploading…" : "Add video"}
          </Button>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadVideo(f);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-slate-400">{urls.length} / {maxImages} items</p>
    </div>
  );
}
