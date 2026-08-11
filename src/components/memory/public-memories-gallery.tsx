"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Grid3X3,
  Heart,
  ImageIcon,
  MessageCircle,
  Play,
  Trash2,
  Video,
  Volume2,
  VolumeX,
  X,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaginationBar } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { resolvePublicMediaUrl } from "@/lib/uploads/media-url";
import { pickMemoryFullSrc, pickMemoryGridSrc, isMemoryVideo } from "@/lib/memory/memory-media-urls";
import {
  readOrCreateClientGuestKey,
  readOwnedCommentTokens,
  writeOwnedCommentToken,
  removeOwnedCommentToken,
} from "@/lib/memory/memory-guest-identity";
import { MemoryShareBar } from "@/components/memory/memory-share-bar";

export interface MemoryGalleryItem {
  id: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
  uploaderName?: string | null;
  isFeatured?: boolean;
  likeCount?: number;
  commentCount?: number;
  likedByViewer?: boolean;
  ownedByViewer?: boolean;
  canDelete?: boolean;
}

export type MemoryThemeVars = CSSProperties & Record<`--memory-${string}`, string>;

type MediaFilter = "all" | "image" | "video";

interface CommentRow {
  id: string;
  authorName: string;
  message: string;
  createdAt: string;
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
  onFilterChange?: (filter: MediaFilter) => void;
  activeFilter?: MediaFilter;
  loading?: boolean;
  themeVars?: MemoryThemeVars;
  viewToken?: string;
  canModerate?: boolean;
  onItemsChange?: (items: MemoryGalleryItem[]) => void;
}

const MUTE_PREF_KEY = "celeventic.memory.videoMuted";

function readMutePref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(MUTE_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMutePref(muted: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(MUTE_PREF_KEY, muted ? "1" : "0");
  } catch {
    /* ignore */
  }
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
  themeVars,
  viewToken,
  canModerate = false,
  onItemsChange,
}: PublicMemoriesGalleryProps) {
  const [lightbox, setLightbox] = useState<MemoryGalleryItem | null>(null);
  const [localItems, setLocalItems] = useState(items);
  const [heartBurst, setHeartBurst] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const lastTapRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const guestKey = useMemo(() => readOrCreateClientGuestKey(), []);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  useEffect(() => {
    setMuted(readMutePref());
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const hash = `memory-${lightbox.id}`;
    if (typeof window !== "undefined" && window.location.hash !== `#${hash}`) {
      window.history.replaceState(null, "", `#${hash}`);
    }
  }, [lightbox]);

  useEffect(() => {
    if (typeof window === "undefined" || !items.length) return;
    const hash = window.location.hash.replace(/^#/, "");
    const match = /^memory-(.+)$/.exec(hash);
    if (!match) return;
    const found = items.find((i) => i.id === match[1]);
    if (found) setLightbox(found);
  }, [items]);

  const syncItems = useCallback(
    (next: MemoryGalleryItem[]) => {
      setLocalItems(next);
      onItemsChange?.(next);
    },
    [onItemsChange]
  );

  const filters: { id: MediaFilter; label: string; icon: typeof Grid3X3 }[] = [
    { id: "all", label: "All", icon: Grid3X3 },
    { id: "image", label: "Photos", icon: ImageIcon },
    { id: "video", label: "Videos", icon: Video },
  ];

  async function toggleLike(item: MemoryGalleryItem) {
    if (!viewToken) return;
    const res = await fetch(`/api/public/memories/${viewToken}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memoryId: item.id, guestKey }),
    });
    const json = await res.json();
    if (!json.success) return;
    syncItems(
      localItems.map((row) =>
        row.id === item.id
          ? { ...row, likedByViewer: json.data.liked, likeCount: json.data.likeCount }
          : row
      )
    );
    if (lightbox?.id === item.id) {
      setLightbox((prev) =>
        prev
          ? { ...prev, likedByViewer: json.data.liked, likeCount: json.data.likeCount }
          : prev
      );
    }
    if (json.data.liked) {
      setHeartBurst(true);
      window.setTimeout(() => setHeartBurst(false), 700);
    }
  }

  function onMediaDoubleTap(item: MemoryGalleryItem) {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      void toggleLike(item);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
    window.setTimeout(() => {
      if (lastTapRef.current === now) {
        setLightbox(item);
        setVideoReady(false);
        setCommentsOpen(false);
      }
    }, 280);
  }

  async function loadComments(memoryId: string) {
    if (!viewToken) return;
    const res = await fetch(
      `/api/public/memories/${viewToken}/comments?memoryId=${encodeURIComponent(memoryId)}&limit=50`
    );
    const json = await res.json();
    if (json.success) setComments(json.data.items);
  }

  async function openComments(item: MemoryGalleryItem) {
    setLightbox(item);
    setCommentsOpen(true);
    await loadComments(item.id);
  }

  async function submitComment() {
    if (!viewToken || !lightbox) return;
    setCommentBusy(true);
    try {
      const res = await fetch(`/api/public/memories/${viewToken}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memoryId: lightbox.id,
          authorName: commentName.trim() || "Guest",
          message: commentText.trim(),
          guestKey,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Could not comment");
      if (json.data?.authorToken && json.data?.id) {
        writeOwnedCommentToken(json.data.id, json.data.authorToken);
      }
      setCommentText("");
      await loadComments(lightbox.id);
      syncItems(
        localItems.map((row) =>
          row.id === lightbox.id ? { ...row, commentCount: (row.commentCount ?? 0) + 1 } : row
        )
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not comment");
    } finally {
      setCommentBusy(false);
    }
  }

  async function deleteComment(commentId: string) {
    if (!viewToken) return;
    const owned = readOwnedCommentTokens();
    const res = await fetch(`/api/public/memories/${viewToken}/comments/${commentId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorToken: owned[commentId] }),
    });
    const json = await res.json();
    if (!json.success) {
      window.alert(json.error || "Could not delete comment");
      return;
    }
    removeOwnedCommentToken(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    if (lightbox) {
      syncItems(
        localItems.map((row) =>
          row.id === lightbox.id
            ? { ...row, commentCount: Math.max(0, (row.commentCount ?? 1) - 1) }
            : row
        )
      );
    }
  }

  async function deleteMemory(item: MemoryGalleryItem) {
    if (!viewToken || !item.canDelete) return;
    if (!window.confirm("Delete this memory?")) return;
    const res = await fetch(`/api/public/memories/${viewToken}/media/${item.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestKey }),
    });
    const json = await res.json();
    if (!json.success) {
      window.alert(json.error || "Could not delete");
      return;
    }
    syncItems(localItems.filter((row) => row.id !== item.id));
    setLightbox(null);
  }

  function setMute(next: boolean) {
    setMuted(next);
    writeMutePref(next);
    const video = videoRef.current;
    if (video) {
      video.muted = next;
      if (!next) void video.play().catch(() => undefined);
    }
  }

  /** Explicit tap-to-play with sound when possible (Safari-friendly). */
  async function playWithSound() {
    const video = videoRef.current;
    if (!video) return;
    setVideoReady(true);
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    const preferMuted = readMutePref();
    video.muted = preferMuted;
    setMuted(preferMuted);
    try {
      await video.play();
      if (!preferMuted && video.muted) {
        // Browser forced mute — keep unmute control obvious.
        setMuted(true);
      }
    } catch {
      video.muted = true;
      setMuted(true);
      writeMutePref(true);
      try {
        await video.play();
      } catch {
        /* user can use native controls */
      }
    }
  }

  const shellStyle: CSSProperties = {
    ...themeVars,
    background: `linear-gradient(180deg, var(--memory-color-surface, #FAFAFA) 0%, var(--memory-color-surface-alt, #F3EEE6) 100%)`,
    color: "var(--memory-color-ink, #0F172A)",
    fontFamily: "var(--memory-font-body, inherit)",
  };

  return (
    <div className="public-viewport-shell" style={shellStyle}>
      <div className="memory-viewport-stage">
      <header
        className="sticky top-0 z-20 backdrop-blur-md border-b"
        style={{
          background: "color-mix(in srgb, var(--memory-color-surface, #FAFAFA) 92%, transparent)",
          borderColor: "var(--memory-color-border, #e5e7eb)",
        }}
      >
        <div className="px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 text-center">
          <p
            className="text-[10px] uppercase tracking-[0.35em] mb-1"
            style={{ color: "var(--memory-color-ink-muted, #64748b)" }}
          >
            Event memories
          </p>
          <h1
            className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight"
            style={{ fontFamily: "var(--memory-font-display, Georgia, serif)" }}
          >
            {eventTitle}
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--memory-color-ink-muted, #64748b)" }}>
            Hosted by {hostName}
          </p>
          <p className="text-[11px] mt-2" style={{ color: "var(--memory-color-ink-muted, #94a3b8)" }}>
            {total} {total === 1 ? "memory" : "memories"}
          </p>
        </div>

        <div className="flex border-t" style={{ borderColor: "var(--memory-color-border, #e5e7eb)" }}>
          {filters.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                onFilterChange?.(id);
                onPageChange(1);
              }}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold uppercase tracking-wide border-b-2 min-h-12 touch-manipulation"
              )}
              style={{
                borderBottomColor:
                  activeFilter === id ? "var(--memory-color-accent, #0F172A)" : "transparent",
                color:
                  activeFilter === id
                    ? "var(--memory-color-ink, #0F172A)"
                    : "var(--memory-color-ink-muted, #94a3b8)",
              }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-0.5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {loading && localItems.length === 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-0.5 p-0.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] animate-pulse"
                style={{ background: "var(--memory-color-accent-soft, #e2e8f0)" }}
              />
            ))}
          </div>
        ) : localItems.length === 0 ? (
          <div
            className="mx-4 mt-12 rounded-2xl border border-dashed p-10 text-center"
            style={{
              borderColor: "var(--memory-color-border, #e5e7eb)",
              background:
                "linear-gradient(160deg, color-mix(in srgb, var(--memory-color-accent-soft, #f5e6c8) 35%, transparent), transparent)",
            }}
          >
            <Grid3X3
              className="h-10 w-10 mx-auto mb-3 opacity-40"
              style={{ color: "var(--memory-color-accent, #b08d57)" }}
            />
            <p
              className="font-medium text-lg"
              style={{ fontFamily: "var(--memory-font-display, Georgia, serif)" }}
            >
              No {activeFilter === "all" ? "" : activeFilter === "image" ? "photo " : "video "}
              memories yet
            </p>
            <p className="text-sm mt-2" style={{ color: "var(--memory-color-ink-muted, #64748b)" }}>
              Approved uploads will appear here in a portrait gallery.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-0.5">
            {localItems.map((item) => {
              const gridSrc = resolvePublicMediaUrl(pickMemoryGridSrc(item));
              const video = isMemoryVideo(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  className="relative aspect-[4/5] overflow-hidden group touch-manipulation"
                  style={{ background: "var(--memory-color-accent-soft, #e2e8f0)" }}
                  onClick={() => onMediaDoubleTap(item)}
                  aria-label={video ? "Open video" : "Open photo"}
                >
                  {/* Grid: lightweight poster/thumb only — never mount <video> here. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gridSrc}
                    alt={item.caption ?? (video ? "Video memory" : "Memory")}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  {video ? (
                    <span className="absolute top-2 right-2 rounded-full bg-black/55 p-1.5">
                      <Play className="h-3 w-3 text-white fill-white" />
                    </span>
                  ) : null}
                  {item.isFeatured ? (
                    <span
                      className="absolute top-1.5 left-1.5 text-[9px] text-white px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: "var(--memory-color-accent, #D4A63A)" }}
                    >
                      ★
                    </span>
                  ) : null}
                  {(item.likeCount ?? 0) > 0 ? (
                    <span className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 text-[10px] text-white drop-shadow">
                      <Heart className="h-3 w-3 fill-white" /> {item.likeCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}

        {pages > 1 ? (
          <PaginationBar
            page={page}
            pages={pages}
            total={total}
            limit={21}
            onPageChange={onPageChange}
            className="mt-4 px-4"
          />
        ) : null}
      </div>
      </div>

      {lightbox ? (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <p className="text-white/80 text-sm font-medium truncate flex-1">{eventTitle}</p>
            <button type="button" onClick={() => setLightbox(null)} className="text-white p-2 -mr-2 min-h-11 min-w-11">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div
            className="flex-1 flex items-center justify-center px-2 min-h-0 relative"
            onClick={() => {
              const now = Date.now();
              if (now - lastTapRef.current < 320) {
                void toggleLike(lightbox);
                lastTapRef.current = 0;
              } else {
                lastTapRef.current = now;
              }
            }}
          >
            {isMemoryVideo(lightbox) ? (
              <div className="relative max-w-full max-h-[78vh] w-full flex items-center justify-center">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  ref={videoRef}
                  key={lightbox.id}
                  className="max-w-full max-h-[78vh] rounded-lg"
                  poster={resolvePublicMediaUrl(lightbox.thumbnailUrl) || undefined}
                  controls={videoReady}
                  playsInline
                  preload="metadata"
                  muted={muted}
                  onClick={(e) => e.stopPropagation()}
                >
                  <source src={resolvePublicMediaUrl(pickMemoryFullSrc(lightbox))} type="video/mp4" />
                </video>
                {!videoReady ? (
                  <button
                    type="button"
                    className="absolute inset-0 flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      void playWithSound();
                    }}
                    aria-label="Play video with sound"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolvePublicMediaUrl(pickMemoryGridSrc(lightbox))}
                      alt=""
                      className="absolute inset-0 w-full h-full object-contain opacity-90 pointer-events-none"
                    />
                    <span className="relative z-10 rounded-full bg-black/60 p-5 ring-2 ring-white/40">
                      <Play className="h-8 w-8 text-white fill-white" />
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="absolute bottom-4 right-4 z-20 rounded-full bg-black/60 text-white p-3 min-h-12 min-w-12 touch-manipulation"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMute(!muted);
                    }}
                    aria-label={muted ? "Unmute" : "Mute"}
                  >
                    {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </button>
                )}
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolvePublicMediaUrl(pickMemoryFullSrc(lightbox))}
                alt={lightbox.caption ?? ""}
                className="max-w-full max-h-full object-contain"
              />
            )}
            {heartBurst ? (
              <Heart className="absolute h-20 w-20 text-white fill-white animate-ping pointer-events-none" />
            ) : null}
          </div>

          <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3 text-white">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="p-2 min-h-11 min-w-11"
                onClick={() => void toggleLike(lightbox)}
                aria-label="Like"
              >
                <Heart
                  className={cn("h-6 w-6", lightbox.likedByViewer && "fill-rose-500 text-rose-500")}
                />
              </button>
              <span className="text-sm tabular-nums">{lightbox.likeCount ?? 0}</span>
              <button
                type="button"
                className="p-2 min-h-11 min-w-11"
                onClick={() => void openComments(lightbox)}
                aria-label="Comments"
              >
                <MessageCircle className="h-6 w-6" />
              </button>
              <span className="text-sm tabular-nums">{lightbox.commentCount ?? 0}</span>
              {lightbox.canDelete || canModerate ? (
                <button
                  type="button"
                  className="p-2 min-h-11 min-w-11 ml-auto text-rose-300"
                  onClick={() => void deleteMemory(lightbox)}
                  aria-label="Delete memory"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              ) : null}
            </div>

            {(lightbox.caption || lightbox.uploaderName) && (
              <div className="text-sm">
                {lightbox.uploaderName ? <p className="font-semibold">{lightbox.uploaderName}</p> : null}
                {lightbox.caption ? <p className="text-white/80 mt-0.5">{lightbox.caption}</p> : null}
              </div>
            )}

            {viewToken ? (
              <MemoryShareBar
                viewToken={viewToken}
                memoryId={lightbox.id}
                eventTitle={eventTitle}
                mediaUrl={lightbox.mediaUrl}
                allowDownload={allowDownloads}
              />
            ) : null}

            {commentsOpen ? (
              <div className="rounded-2xl bg-white/10 p-3 space-y-2 max-h-48 overflow-y-auto">
                {comments.map((c) => {
                  const owned = Boolean(readOwnedCommentTokens()[c.id]);
                  return (
                    <div key={c.id} className="text-sm flex gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{c.authorName}</p>
                        <p className="text-white/80 break-words">{c.message}</p>
                      </div>
                      {(owned || canModerate) && (
                        <button
                          type="button"
                          className="text-rose-300 p-1"
                          onClick={() => void deleteComment(c.id)}
                          aria-label="Delete comment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
                <div className="flex gap-2 pt-1">
                  <input
                    value={commentName}
                    onChange={(e) => setCommentName(e.target.value)}
                    placeholder="Your name"
                    className="flex-1 rounded-lg bg-black/30 px-3 py-2 text-sm outline-none min-h-11"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment…"
                    className="flex-1 rounded-lg bg-black/30 px-3 py-2 text-sm outline-none min-h-11"
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="min-h-11 min-w-11"
                    disabled={commentBusy || !commentText.trim()}
                    onClick={() => void submitComment()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Prefer `@/components/thank-you/thank-you-public-view` */
export { ThankYouPublicView } from "@/components/thank-you/thank-you-public-view";
