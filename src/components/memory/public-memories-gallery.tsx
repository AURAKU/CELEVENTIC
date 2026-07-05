"use client";

import { useState } from "react";
import { Grid3X3, ImageIcon, Video, X, Download, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaginationBar } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import type { ThankYouTemplate } from "@/lib/thank-you/templates";

export interface MemoryGalleryItem {
  id: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
  uploaderName?: string | null;
  isFeatured?: boolean;
}

type MediaFilter = "all" | "image" | "video";

interface PublicMemoriesGalleryProps {
  eventTitle: string;
  hostName: string;
  items: MemoryGalleryItem[];
  page: number;
  pages: number;
  total: number;
  allowDownloads?: boolean;
  onPageChange: (page: number) => void;
  onFilterChange?: (filter: MediaFilter) => void;
  activeFilter?: MediaFilter;
  loading?: boolean;
}

export function PublicMemoriesGallery({
  eventTitle,
  hostName,
  items,
  page,
  pages,
  total,
  allowDownloads,
  onPageChange,
  onFilterChange,
  activeFilter = "all",
  loading = false,
}: PublicMemoriesGalleryProps) {
  const [lightbox, setLightbox] = useState<MemoryGalleryItem | null>(null);

  const filters: { id: MediaFilter; label: string; icon: typeof Grid3X3 }[] = [
    { id: "all", label: "All", icon: Grid3X3 },
    { id: "image", label: "Photos", icon: ImageIcon },
    { id: "video", label: "Videos", icon: Video },
  ];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#FAFAFA]">
      {/* Profile-style header */}
      <header className="sticky top-0 z-20 bg-[#FAFAFA]/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400 mb-1">Event memories</p>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-[#0F172A] leading-tight">{eventTitle}</h1>
          <p className="text-slate-500 text-xs mt-1">Hosted by {hostName}</p>
          <p className="text-slate-400 text-[11px] mt-2">{total} {total === 1 ? "memory" : "memories"}</p>
        </div>

        {/* Instagram-style filter tabs */}
        <div className="flex border-t border-slate-200/80">
          {filters.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                onFilterChange?.(id);
                onPageChange(1);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold uppercase tracking-wide transition-colors border-b-2",
                activeFilter === id
                  ? "border-[#0F172A] text-[#0F172A]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-0.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {loading && items.length === 0 ? (
          <div className="grid grid-cols-3 gap-0.5 p-0.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mx-4 mt-12 rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
            <Grid3X3 className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No {activeFilter === "all" ? "" : activeFilter === "image" ? "photo " : "video "}memories yet</p>
            <p className="text-sm mt-1 text-slate-400">Approved uploads will appear here in portrait grid.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="relative aspect-[4/5] overflow-hidden bg-slate-100 group"
                onClick={() => setLightbox(item)}
              >
                {item.mediaType === "video" ? (
                  <>
                    <video
                      src={item.thumbnailUrl ?? item.mediaUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                    <span className="absolute top-2 right-2 rounded-full bg-black/50 p-1">
                      <Play className="h-3 w-3 text-white fill-white" />
                    </span>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnailUrl ?? item.mediaUrl}
                    alt={item.caption ?? "Memory"}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                )}
                {item.isFeatured && (
                  <span className="absolute top-1.5 left-1.5 text-[9px] bg-[#D4A63A] text-white px-1.5 py-0.5 rounded-full font-medium">
                    ★
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {pages > 1 && (
          <PaginationBar
            page={page}
            pages={pages}
            total={total}
            limit={20}
            onPageChange={onPageChange}
            className="mt-4 px-4"
          />
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <p className="text-white/80 text-sm font-medium truncate flex-1">{eventTitle}</p>
            <button type="button" onClick={() => setLightbox(null)} className="text-white p-2 -mr-2">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center px-2 min-h-0">
            {lightbox.mediaType === "video" ? (
              <video src={lightbox.mediaUrl} controls autoPlay className="max-w-full max-h-full rounded-lg" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightbox.mediaUrl}
                alt={lightbox.caption ?? ""}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
          <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2">
            {(lightbox.caption || lightbox.uploaderName) && (
              <div className="text-white text-sm">
                {lightbox.uploaderName && <p className="font-semibold">{lightbox.uploaderName}</p>}
                {lightbox.caption && <p className="text-white/80 mt-0.5">{lightbox.caption}</p>}
              </div>
            )}
            {allowDownloads && (
              <Button variant="secondary" size="sm" className="gap-1" asChild>
                <a href={lightbox.mediaUrl} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" /> Download
                </a>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ThankYouPublicViewProps {
  title?: string | null;
  message?: string | null;
  hostName: string;
  eventTitle: string;
  flyerUrl?: string | null;
  hostPhotoUrl?: string | null;
  audioUrl?: string | null;
  template: ThankYouTemplate;
  uploadUrl?: string;
  memoriesUrl?: string;
  qrImageUrl?: string;
}

export function ThankYouPublicView({
  title,
  message,
  hostName,
  eventTitle,
  flyerUrl,
  hostPhotoUrl,
  audioUrl,
  template,
  uploadUrl,
  memoriesUrl,
  qrImageUrl,
}: ThankYouPublicViewProps) {
  const [audioPlaying, setAudioPlaying] = useState(false);
  const displayTitle = title ?? `Thank You — ${eventTitle}`;

  async function sharePage() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: displayTitle, text: message ?? undefined, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard");
    }
  }

  return (
    <div className="min-h-screen" style={{ background: template.background, fontFamily: template.fontFamily }}>
      <div className="max-w-lg mx-auto px-4 py-10 space-y-8">
        <header className="text-center space-y-4">
          {(hostPhotoUrl || flyerUrl) && (
            <div className="mx-auto w-32 h-32 rounded-full overflow-hidden border-4 shadow-lg" style={{ borderColor: template.accentColor }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hostPhotoUrl ?? flyerUrl ?? ""} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
          <p className="text-[10px] uppercase tracking-[0.35em] opacity-70">With gratitude</p>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: template.id === "minimal-white-gold" ? "#0F172A" : "#FAF8F4" }}>
            {displayTitle}
          </h1>
          <p className="text-sm opacity-80" style={{ color: template.id === "minimal-white-gold" ? "#475569" : "#E2E8F0" }}>
            {hostName}
          </p>
        </header>

        {flyerUrl && (
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flyerUrl} alt="Thank you flyer" className="w-full" loading="lazy" />
          </div>
        )}

        {message && (
          <div
            className="rounded-2xl p-6 text-center leading-relaxed text-sm"
            style={{
              background: `${template.accentColor}15`,
              color: template.id === "minimal-white-gold" ? "#334155" : "#F1F5F9",
              border: `1px solid ${template.accentColor}40`,
            }}
          >
            {message}
          </div>
        )}

        {audioUrl && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              className="gap-2"
              style={{ borderColor: template.accentColor, color: template.accentColor }}
              onClick={() => {
                const el = document.getElementById("thank-you-audio") as HTMLAudioElement | null;
                if (!el) return;
                if (audioPlaying) {
                  el.pause();
                } else {
                  void el.play();
                }
                setAudioPlaying(!audioPlaying);
              }}
            >
              {audioPlaying ? "Pause music" : "Play thank-you music"}
            </Button>
            <audio id="thank-you-audio" src={audioUrl} loop onEnded={() => setAudioPlaying(false)} />
          </div>
        )}

        <div className="grid gap-3">
          {uploadUrl && (
            <Button asChild className="w-full min-h-[48px]" style={{ backgroundColor: template.accentColor }}>
              <a href={uploadUrl}>Upload your photos & videos</a>
            </Button>
          )}
          {memoriesUrl && (
            <Button asChild variant="outline" className="w-full min-h-[48px]" style={{ borderColor: template.accentColor, color: template.accentColor }}>
              <a href={memoriesUrl}>View event memories</a>
            </Button>
          )}
          <Button variant="outline" className="w-full gap-2" onClick={() => void sharePage()}>
            Share thank-you page
          </Button>
          {flyerUrl && (
            <Button variant="outline" className="w-full gap-2" asChild>
              <a href={flyerUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" /> Download flyer
              </a>
            </Button>
          )}
        </div>

        {qrImageUrl && (
          <div className="rounded-2xl bg-white/10 backdrop-blur p-6 text-center space-y-3">
            <p className="text-sm font-medium" style={{ color: template.id === "minimal-white-gold" ? "#0F172A" : "#FAF8F4" }}>
              Scan to upload memories
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrImageUrl} alt="Upload QR code" className="w-40 h-40 mx-auto rounded-xl bg-white p-2" loading="lazy" />
          </div>
        )}

        <p className="text-center text-[10px] uppercase tracking-widest opacity-50" style={{ color: template.id === "minimal-white-gold" ? "#64748B" : "#CBD5E1" }}>
          Powered by Celeventic
        </p>
      </div>
    </div>
  );
}
