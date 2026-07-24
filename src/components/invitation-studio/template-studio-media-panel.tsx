"use client";

import { useState } from "react";
import { ImageIcon, Images, Layout, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GalleryUploadPanel } from "@/components/media/gallery-upload-panel";
import { ImageUploadCropper } from "@/components/media/image-upload-cropper";
import { UploadedMedia } from "@/components/media/uploaded-media";
import { VideoUploader, type UploadedVideoResult } from "@/components/media/video-uploader";
import { CROP_PRESETS } from "@/lib/image/crop-utils";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import { heroUrlFromDesign, pageBackgroundFromDesign, syncDesignMediaHero, syncDesignPageBackground } from "@/lib/invitation/studio-media-utils";
import { getMediaEntranceForLayout } from "@/lib/invitation/media-entrance-engine";
import { MEDIA_ENTRANCE_OPTIONS } from "@/lib/invitation/media-entrance-engine";
import { isVideoUrl } from "@/lib/invitation/demo-gallery-assets";

interface TemplateStudioMediaPanelProps {
  design: InvitationDesignConfig;
  galleryUrls: string[];
  onDesignChange: (design: InvitationDesignConfig) => void;
  onGalleryChange: (urls: string[]) => void;
  disabled?: boolean;
  maxGalleryImages?: number;
  allowVideoBackground?: boolean;
  /** When editing a live customer order, ownership is double-checked against this order. */
  orderId?: string;
}

function MediaSection({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 space-y-3 shadow-sm">
      <div className="flex items-start gap-2">
        <div className="rounded-lg bg-[#0B8A83]/10 p-2">
          <Icon className="h-4 w-4 text-[#0B8A83]" />
        </div>
        <div>
          <p className="font-semibold text-sm text-[#0F172A]">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{hint}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function TemplateStudioMediaPanel({
  design,
  galleryUrls,
  onDesignChange,
  onGalleryChange,
  disabled,
  maxGalleryImages = 30,
  allowVideoBackground = true,
  orderId,
}: TemplateStudioMediaPanelProps) {
  const heroUrl = heroUrlFromDesign(design);
  const pageBg = pageBackgroundFromDesign(design);
  const pageBgUrl = pageBg.backgroundVideoUrl ?? pageBg.backgroundImageUrl;
  const entrance = getMediaEntranceForLayout(design.layout ?? "classic-gold");
  const entranceLabel = MEDIA_ENTRANCE_OPTIONS.find((o) => o.id === entrance)?.label ?? entrance;
  const [error, setError] = useState("");

  function setHero(url: string, type: "image" | "video") {
    onDesignChange(syncDesignMediaHero(design, url, type));
    if (!galleryUrls.includes(url)) {
      onGalleryChange([url, ...galleryUrls].slice(0, 30));
    }
  }

  function clearHero() {
    onDesignChange(syncDesignMediaHero(design, null));
  }

  function onHeroVideoUploaded(result: UploadedVideoResult) {
    if (result.processedMp4Url) setHero(result.processedMp4Url, "video");
  }

  function clearPageBackground() {
    onDesignChange(syncDesignPageBackground(design, null));
  }

  function setPageBackground(url: string, type: "image" | "video") {
    onDesignChange(syncDesignPageBackground(design, url, type));
  }

  function onPageBackgroundVideoUploaded(result: UploadedVideoResult) {
    if (result.processedMp4Url) setPageBackground(result.processedMp4Url, "video");
  }

  return (
    <section className="rounded-2xl border bg-white p-5 space-y-5">
      <div>
        <h3 className="font-semibold flex items-center gap-2 text-[#0F172A]">
          <Images className="h-4 w-4 text-[#0B8A83]" /> Template media studio
        </h3>
        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-[#D4A63A]" />
          Each slot fits its frame with <span className="font-medium">object-cover</span>. Guests tap to open fullscreen and swipe to browse (
          <span className="font-medium text-[#0B8A83]">{entranceLabel}</span> entrance).
        </p>
      </div>

      <MediaSection
        icon={ImageIcon}
        title="Hero photo / video"
        hint="Main card image on the invitation — tap opens fullscreen for guests."
      >
        {heroUrl ? (
          <div className="relative rounded-xl overflow-hidden border aspect-[4/5] max-h-56 bg-slate-100 inv-hero-media-frame">
            <UploadedMedia
              src={heroUrl}
              alt="Hero"
              className="w-full h-full object-cover object-center"
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
          <p className="text-xs text-slate-400 italic">No hero yet — upload below or add gallery items.</p>
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
            hint="4:5 portrait crop — fits hero frame neatly."
            className="flex-1"
          />
        </div>
        <VideoUploader
          category="INVITATION_BACKGROUND"
          orderId={orderId}
          role="hero"
          buttonLabel="Hero video"
          hint="Phone, DSLR, or exported clip — up to 150MB. Processed automatically for smooth playback."
          disabled={disabled}
          onUploaded={onHeroVideoUploaded}
          onError={setError}
        />
      </MediaSection>

      <MediaSection
        icon={Layout}
        title="Full-page background"
        hint="Behind the entire invite experience — separate from the hero card."
      >
        {pageBgUrl ? (
          <div className="relative rounded-xl overflow-hidden border aspect-video max-h-40 bg-slate-100">
            <UploadedMedia
              src={pageBgUrl}
              alt="Page background"
              className="w-full h-full object-cover object-center"
              video={Boolean(pageBg.backgroundVideoUrl)}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="absolute top-2 right-2"
              onClick={clearPageBackground}
              disabled={disabled}
            >
              Remove
            </Button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Uses template atmosphere until you upload a custom background.</p>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <ImageUploadCropper
            defaultAspect="16:9"
            allowedAspects={CROP_PRESETS.cover}
            extraFormFields={{ role: "background", buildMode: "template" }}
            onUploaded={(r) => setPageBackground(r.url, "image")}
            onError={setError}
            disabled={disabled}
            buttonLabel="Background image"
            hint="16:9 wide crop for cinematic backgrounds."
            className="flex-1"
          />
        </div>
        {allowVideoBackground && (
          <VideoUploader
            category="INVITATION_BACKGROUND"
            orderId={orderId}
            role="background"
            mute
            buttonLabel="Background video"
            hint="Loop-friendly background clip — up to 150MB, muted automatically for ambient playback."
            disabled={disabled}
            onUploaded={onPageBackgroundVideoUploaded}
            onError={setError}
          />
        )}
      </MediaSection>

      <GalleryUploadPanel
        urls={galleryUrls}
        onChange={onGalleryChange}
        disabled={disabled}
        maxImages={maxGalleryImages}
        orderId={orderId}
        title="Swipe gallery"
        description="Ordered slots for the interactive gallery — guests swipe between items and tap any photo or video to open fullscreen."
      />

      {error && <p className="text-xs text-red-600">{error}</p>}
    </section>
  );
}
