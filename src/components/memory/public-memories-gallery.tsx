"use client";

import { useState } from "react";
import { Heart, Download, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaginationBar } from "@/components/ui/pagination";
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

interface PublicMemoriesGalleryProps {
  eventTitle: string;
  hostName: string;
  items: MemoryGalleryItem[];
  page: number;
  pages: number;
  total: number;
  allowDownloads?: boolean;
  onPageChange: (page: number) => void;
  slideshow?: boolean;
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
  slideshow = false,
}: PublicMemoriesGalleryProps) {
  const [lightbox, setLightbox] = useState<MemoryGalleryItem | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center space-y-2">
        <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Event memories</p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0F172A]">{eventTitle}</h1>
        <p className="text-slate-600 text-sm">Hosted by {hostName}</p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-slate-500">
          <Heart className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No approved memories yet</p>
          <p className="text-sm mt-1">Check back after the organizer approves guest uploads.</p>
        </div>
      ) : (
        <div className={slideshow ? "space-y-4" : "grid grid-cols-2 sm:grid-cols-3 gap-3"}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`relative rounded-xl overflow-hidden border bg-slate-100 group text-left ${
                slideshow ? "aspect-video w-full" : "aspect-square"
              }`}
              onClick={() => setLightbox(item)}
            >
              {item.mediaType === "video" ? (
                <video
                  src={item.thumbnailUrl ?? item.mediaUrl}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbnailUrl ?? item.mediaUrl}
                  alt={item.caption ?? "Memory"}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              )}
              {item.isFeatured && (
                <span className="absolute top-2 left-2 text-[10px] bg-[#D4A63A] text-white px-2 py-0.5 rounded-full">
                  Featured
                </span>
              )}
              {item.caption && (
                <p className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs p-2 line-clamp-2">
                  {item.caption}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      <PaginationBar page={page} pages={pages} total={total} limit={20} onPageChange={onPageChange} />

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="max-w-3xl w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            {lightbox.mediaType === "video" ? (
              <video src={lightbox.mediaUrl} controls autoPlay className="w-full max-h-[70vh] rounded-xl" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightbox.mediaUrl}
                alt={lightbox.caption ?? ""}
                className="w-full max-h-[70vh] object-contain rounded-xl mx-auto"
              />
            )}
            {(lightbox.caption || lightbox.uploaderName) && (
              <div className="text-white text-center text-sm space-y-1">
                {lightbox.caption && <p>{lightbox.caption}</p>}
                {lightbox.uploaderName && <p className="text-white/60">— {lightbox.uploaderName}</p>}
              </div>
            )}
            <div className="flex justify-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setLightbox(null)}>
                Close
              </Button>
              {allowDownloads && (
                <Button variant="outline" size="sm" className="gap-1" asChild>
                  <a href={lightbox.mediaUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" /> Download
                  </a>
                </Button>
              )}
            </div>
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
              {audioPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
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
