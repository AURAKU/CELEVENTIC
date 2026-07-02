"use client";

import { useRef, useState } from "react";
import { Film, ImageIcon, Images, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GalleryUploadPanel } from "@/components/media/gallery-upload-panel";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { UploadedMedia } from "@/components/media/uploaded-media";
import { CROP_PRESETS } from "@/lib/image/crop-utils";
import { uploadFormDataWithProgress, validateClientVideo } from "@/lib/media/upload-with-progress";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import { heroUrlFromDesign, syncDesignMediaHero } from "@/lib/invitation/studio-media-utils";
import { getMediaEntranceForLayout } from "@/lib/invitation/media-entrance-engine";
import { MEDIA_ENTRANCE_OPTIONS } from "@/lib/invitation/media-entrance-engine";
import { isVideoUrl } from "@/lib/invitation/demo-gallery-assets";

interface TemplateStudioMediaPanelProps {
  design: InvitationDesignConfig;
  galleryUrls: string[];
  onDesignChange: (design: InvitationDesignConfig) => void;
  onGalleryChange: (urls: string[]) => void;
  disabled?: boolean;
}

export function TemplateStudioMediaPanel({
  design,
  galleryUrls,
  onDesignChange,
  onGalleryChange,
  disabled,
}: TemplateStudioMediaPanelProps) {
  const heroUrl = heroUrlFromDesign(design);
  const entrance = getMediaEntranceForLayout(design.layout ?? "classic-gold");
  const entranceLabel = MEDIA_ENTRANCE_OPTIONS.find((o) => o.id === entrance)?.label ?? entrance;
  const [error, setError] = useState("");
  const [videoUploading, setVideoUploading] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  function setHero(url: string, type: "image" | "video") {
    onDesignChange(syncDesignMediaHero(design, url, type));
    if (!galleryUrls.includes(url)) {
      onGalleryChange([url, ...galleryUrls].slice(0, 30));
    }
  }

  function clearHero() {
    onDesignChange(syncDesignMediaHero(design, null));
  }

  async function uploadHeroVideo(file: File) {
    const err = validateClientVideo(file);
    if (err) {
      setError(err);
      return;
    }
    setVideoUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("role", "background");
      fd.append("buildMode", "template");
      const { ok, json } = await uploadFormDataWithProgress("/api/invitations/upload", fd);
      if (!ok) throw new Error((json.error as string) || "Video upload failed");
      const data = json.data as { url: string };
      setHero(data.url, "video");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Video upload failed");
    } finally {
      setVideoUploading(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-white p-5 space-y-5">
      <div>
        <h3 className="font-semibold flex items-center gap-2 text-[#0F172A]">
          <Images className="h-4 w-4 text-[#0B8A83]" /> Photos & videos
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Upload hero media and gallery items — each template reveals them with a unique entrance (
          <span className="font-medium text-[#0B8A83]">{entranceLabel}</span>). Preview updates live.
        </p>
      </div>

      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <ImageIcon className="h-3.5 w-3.5" /> Hero photo or video
        </Label>
        {heroUrl ? (
          <div className="relative rounded-xl overflow-hidden border aspect-[4/5] max-h-56 bg-slate-100">
            <UploadedMedia
              src={heroUrl}
              alt="Hero"
              className="w-full h-full object-cover"
              video={isVideoUrl(heroUrl)}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2"
              onClick={clearHero}
              disabled={disabled}
            >
              Remove
            </Button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No hero media yet — upload below or add gallery photos.</p>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <ImageUploadCropper
            defaultAspect="4:5"
            allowedAspects={CROP_PRESETS.cover}
            extraFormFields={{ role: "hero", buildMode: "template" }}
            onUploaded={(r) => setHero(r.url, "image")}
            onError={setError}
            disabled={disabled}
            buttonLabel="Upload hero photo"
            hint="Crop your cover photo — appears on the invitation card."
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2 min-h-[44px]"
            disabled={disabled || videoUploading}
            onClick={() => videoInputRef.current?.click()}
          >
            {videoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
            Hero video
          </Button>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadHeroVideo(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <GalleryUploadPanel
        urls={galleryUrls}
        onChange={onGalleryChange}
        disabled={disabled}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  );
}
