"use client";

import { useState } from "react";
import { Grid3X3, ImageIcon, Video, X, Download, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaginationBar } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { resolvePublicMediaUrl } from "@/lib/uploads/media-url";
import { CeleventicVideo } from "@/components/media/celeventic-media";

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
                    {item.thumbnailUrl ? (
                      // Poster JPEG, cheap to render at grid scale, no video metadata fetch
                      // needed just to show a thumbnail. Never point a <video> src at a JPEG.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolvePublicMediaUrl(item.thumbnailUrl)}
                        alt={item.caption ?? "Video memory"}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <CeleventicVideo
                        src={item.mediaUrl}
                        poster={item.thumbnailUrl}
                        className="w-full h-full object-cover"
                        autoPlayMuted={false}
                        controls={false}
                        preload="metadata"
                      />
                    )}
                    <span className="absolute top-2 right-2 rounded-full bg-black/50 p-1">
                      <Play className="h-3 w-3 text-white fill-white" />
                    </span>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolvePublicMediaUrl(item.thumbnailUrl ?? item.mediaUrl)}
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
              <CeleventicVideo
                src={lightbox.mediaUrl}
                poster={lightbox.thumbnailUrl}
                className="max-w-full max-h-[80vh] rounded-lg"
                controls
                autoPlayMuted={false}
                preload="metadata"
                pauseOffscreen={false}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolvePublicMediaUrl(lightbox.mediaUrl)}
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
                <a href={resolvePublicMediaUrl(lightbox.mediaUrl)} download target="_blank" rel="noopener noreferrer">
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

/** @deprecated Prefer `@/components/thank-you/thank-you-public-view` */
export { ThankYouPublicView } from "@/components/thank-you/thank-you-public-view";
