"use client";

import { useState } from "react";
import { X, Images, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { UploadedMedia } from "@/components/media/uploaded-media";
import { MultiVideoUploader } from "@/components/media/multi-video-uploader";
import { type UploadedVideoResult } from "@/components/media/video-uploader";
import { CROP_PRESETS } from "@/lib/image/crop-utils";
import { isVideoUrl } from "@/lib/invitation/demo-gallery-assets";
import { cn } from "@/lib/utils";

export interface GalleryUploadPanelProps {
  urls: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
  /** e.g. "Event gallery" or "Default template gallery" */
  title?: string;
  description?: string;
  uploadEndpoint?: string;
  extraFormFields?: Record<string, string>;
  orderId?: string;
}

export function GalleryUploadPanel({
  urls,
  onChange,
  maxImages = 30,
  disabled,
  title = "Event gallery",
  description = "Upload photos or videos — guests can swipe through and tap any item to open fullscreen on the invitation.",
  uploadEndpoint = "/api/invitations/upload",
  extraFormFields = { role: "gallery", buildMode: "template" },
  orderId,
}: GalleryUploadPanelProps) {
  const [error, setError] = useState("");

  function addUrl(url: string) {
    if (urls.length >= maxImages) {
      setError(`Maximum ${maxImages} items.`);
      return;
    }
    if (urls.includes(url)) return;
    onChange([...urls, url]);
    setError("");
  }

  function removeAt(index: number) {
    onChange(urls.filter((_, i) => i !== index));
  }

  function moveItem(from: number, to: number) {
    if (to < 0 || to >= urls.length) return;
    const next = [...urls];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  function onGalleryVideoUploaded(result: UploadedVideoResult) {
    if (result.processedMp4Url) addUrl(result.processedMp4Url);
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
      <div>
        <div className="flex items-center gap-2">
          <Images className="h-4 w-4 text-brand-600" />
          <Label className="text-base font-semibold">{title}</Label>
        </div>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
      </div>

      {urls.length > 0 && (
        <div className="space-y-2">
          {urls.map((url, i) => {
            const video = isVideoUrl(url);
            return (
              <div
                key={`${url}-${i}`}
                className="flex items-center gap-2 rounded-xl border bg-white p-2 shadow-sm"
              >
                <GripVertical className="h-4 w-4 text-slate-300 shrink-0 hidden sm:block" />
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border bg-slate-100 shrink-0">
                  <UploadedMedia src={url} alt="" className="w-full h-full object-cover" video={video} />
                  <span
                    className={cn(
                      "absolute bottom-0.5 left-0.5 text-[8px] uppercase font-bold px-1 rounded",
                      video ? "bg-violet-600 text-white" : "bg-emerald-600 text-white"
                    )}
                  >
                    {video ? "Video" : "Photo"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700">Slot {i + 1}</p>
                  <p className="text-[10px] text-slate-400 truncate">{url.split("/").pop()}</p>
                </div>
                <div className="flex flex-col gap-0.5 shrink-0">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={disabled || i === 0}
                    onClick={() => moveItem(i, i - 1)}
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={disabled || i === urls.length - 1}
                    onClick={() => moveItem(i, i + 1)}
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeAt(i)}
                  disabled={disabled}
                  aria-label="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {urls.length < maxImages && (
        <div className="space-y-2 pt-1">
          <ImageUploadCropper
            defaultAspect="free"
            allowedAspects={CROP_PRESETS.gallery}
            extraFormFields={extraFormFields}
            uploadEndpoint={uploadEndpoint}
            onUploaded={(r) => addUrl(r.url)}
            onError={setError}
            disabled={disabled}
            buttonLabel={urls.length === 0 ? "Upload gallery photo" : "Add photo"}
            hint="Free crop by default — drag to select any region, any size, or use the full image."
            className="flex-1"
          />
          <MultiVideoUploader
            category="INVITATION_BACKGROUND"
            orderId={orderId}
            role="gallery"
            buttonLabel="Add videos"
            hint="Add one or more videos to the swipe gallery — up to 150MB each."
            disabled={disabled}
            maxFiles={maxImages - urls.length}
            onUploaded={onGalleryVideoUploaded}
            onError={setError}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-slate-400">{urls.length} / {maxImages} slots filled</p>
    </div>
  );
}
