"use client";

import { Camera, Heart, Images } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PostEventExperienceProps {
  eventTitle: string;
  memoryVaultEnabled?: boolean;
  memoryUploadUrl?: string | null;
  memoryAlbumUrl?: string | null;
  galleryCount?: number;
  accentColor?: string;
  thankYouMessage?: string;
}

export function PostEventExperience({
  eventTitle,
  memoryVaultEnabled,
  memoryUploadUrl,
  memoryAlbumUrl,
  galleryCount = 0,
  accentColor = "#0B8A83",
  thankYouMessage,
}: PostEventExperienceProps) {
  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-8 text-center border shadow-sm"
        style={{
          background: `linear-gradient(165deg, ${accentColor}08 0%, #FAF8F4 50%, #fff 100%)`,
          borderColor: `${accentColor}30`,
        }}
      >
        <Heart className="h-8 w-8 mx-auto mb-3" style={{ color: accentColor }} />
        <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500 mb-2">Post-event experience</p>
        <h2 className="font-display text-xl font-bold text-[#0F172A] mb-3">
          Thank you for celebrating {eventTitle}
        </h2>
        <p className="text-slate-600 text-sm leading-relaxed max-w-md mx-auto">
          {thankYouMessage ??
            "The celebration continues in your Album. Relive the moments, share photos, and keep the memories alive."}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {(memoryVaultEnabled || memoryUploadUrl) && (
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <Camera className="h-5 w-5 mb-2" style={{ color: accentColor }} />
            <h3 className="font-semibold text-[#0F172A] text-sm mb-1">Share from your lens</h3>
            <p className="text-xs text-slate-500 mb-3">Upload photos and videos to the shared Album</p>
            {memoryUploadUrl ? (
              <Button size="sm" variant="outline" asChild>
                <a href={memoryUploadUrl}>Open Album upload</a>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  document.getElementById("memory")?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
              >
                Find the Album
              </Button>
            )}
          </div>
        )}
        {(galleryCount > 0 || memoryAlbumUrl) && (
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <Images className="h-5 w-5 mb-2" style={{ color: accentColor }} />
            <h3 className="font-semibold text-[#0F172A] text-sm mb-1">View shared album</h3>
            <p className="text-xs text-slate-500 mb-3">See every guest contribution for {eventTitle}</p>
            {memoryAlbumUrl ? (
              <Button size="sm" variant="outline" asChild>
                <a href={memoryAlbumUrl}>Open album</a>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
              >
                Open gallery
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
