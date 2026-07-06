"use client";

import { useRef, useState } from "react";
import { X, Images, Film, Loader2, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { UploadedMedia } from "@/components/media/uploaded-media";
import { CROP_PRESETS } from "@/lib/image/crop-utils";
import { uploadFormDataWithProgress, validateClientVideo } from "@/lib/media/upload-with-progress";
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
}: GalleryUploadPanelProps) {
  const [error, setError] = useState("");
  const [videoUploading, setVideoUploading] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

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
      Object.entries(extraFormFields).forEach(([k, v]) => fd.append(k, v));
      const { ok, json } = await uploadFormDataWithProgress(uploadEndpoint, fd);
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
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <ImageUploadCropper
            defaultAspect="4:5"
            allowedAspects={CROP_PRESETS.gallery}
            extraFormFields={extraFormFields}
            uploadEndpoint={uploadEndpoint}
            onUploaded={(r) => addUrl(r.url)}
            onError={setError}
            disabled={disabled}
            buttonLabel={urls.length === 0 ? "Upload gallery photo" : "Add photo"}
            hint="Crop to fit the invitation frame — object-cover keeps edges neat."
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
      <p className="text-xs text-slate-400">{urls.length} / {maxImages} slots filled</p>
    </div>
  );
}
