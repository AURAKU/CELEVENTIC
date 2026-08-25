"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ImagePlus,
  Images,
  Loader2,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { uploadFormDataWithProgress } from "@/lib/media/upload-with-progress";
import { MultiVideoUploader } from "@/components/media/multi-video-uploader";
import type { UploadedVideoResult } from "@/components/media/video-uploader";
import {
  readLocalConsent,
  readOrCreateClientGuestKey,
  writeLocalConsent,
} from "@/lib/memory/memory-guest-identity";
import {
  extensionForBlob,
  formatBytes,
  MEMORY_VAULT_IMAGE_COMPRESSION,
  smartCompressImage,
} from "@/lib/image/smart-compress";

type MemoryThemeVars = CSSProperties & Record<`--memory-${string}`, string>;

interface GuestMemoryUploadProps {
  token: string;
  eventTitle: string;
  hostName: string;
  maxPhotosPerGuest: number;
  maxVideosPerGuest: number;
  maxImageSizeMb: number;
  maxVideoSizeMb: number;
  allowAnonymousUploads: boolean;
  windowOpen: boolean;
  memoriesUrl?: string;
  invitationUrl?: string;
  themeVars?: MemoryThemeVars;
  initialHasConsent?: boolean;
  approvalRequired?: boolean;
}

type PhotoQueueItem = {
  id: string;
  file: File;
  previewUrl: string;
  status: "preparing" | "ready" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
  /** Original bytes before smart compress (for friendly “optimized” hints). */
  originalBytes?: number;
};

/** Accept anything the OS calls a photo — we normalize before upload. */
const IMAGE_ACCEPT =
  "image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.avif,.bmp,.tif,.tiff";

/** Absolute raw intake before optimization (phone dumps, HEIC bursts). */
const RAW_INTAKE_MAX_MB = 100;

function friendlyImageError(message: string, maxMb: number): string {
  const lower = message.toLowerCase();
  if (lower.includes("large") || lower.includes("size")) {
    return `That photo couldn’t be optimized under ${maxMb}MB. Try another shot or export a smaller copy.`;
  }
  if (lower.includes("type") || lower.includes("unsupported") || lower.includes("format")) {
    return "We couldn’t read that photo format. Try JPEG, HEIC, PNG, or WebP.";
  }
  return message || "We couldn’t upload that photo. Please try again.";
}

function isProbablyImage(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?)$/i.test(file.name);
}

function compressedFileName(originalName: string, blob: Blob): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "memory";
  return `${base}.${extensionForBlob(blob)}`;
}

export function GuestMemoryUpload({
  token,
  eventTitle,
  hostName,
  maxPhotosPerGuest,
  maxVideosPerGuest,
  maxImageSizeMb,
  maxVideoSizeMb,
  allowAnonymousUploads,
  windowOpen,
  memoriesUrl,
  invitationUrl,
  themeVars,
  initialHasConsent = false,
  approvalRequired = true,
}: GuestMemoryUploadProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const errorAnchorRef = useRef<HTMLDivElement>(null);
  const guestKey = useMemo(() => readOrCreateClientGuestKey(), []);

  const [name, setName] = useState("");
  const [caption, setCaption] = useState("");
  const [consent, setConsent] = useState(false);
  const [hasConsent, setHasConsent] = useState(initialHasConsent || readLocalConsent(token));
  const [photos, setPhotos] = useState<PhotoQueueItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [successCount, setSuccessCount] = useState(0);
  const [videoSuccess, setVideoSuccess] = useState(0);

  useEffect(() => {
    setHasConsent(initialHasConsent || readLocalConsent(token));
  }, [initialHasConsent, token]);

  useEffect(() => {
    return () => {
      for (const item of photos) URL.revokeObjectURL(item.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke only on unmount
  }, []);

  useEffect(() => {
    if (!guestKey) return;
    fetch(`/api/public/memory-upload/${token}?guestKey=${encodeURIComponent(guestKey)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.hasConsent) {
          setHasConsent(true);
          writeLocalConsent(token);
        }
      })
      .catch(() => undefined);
  }, [guestKey, token]);

  const consentOk = hasConsent || consent;
  const photoSlotsLeft = Math.max(0, maxPhotosPerGuest - photos.filter((p) => p.status !== "error").length);
  const uploading = photos.some((p) => p.status === "uploading");
  const preparing = photos.some((p) => p.status === "preparing");
  const readyToShare = photos.some((p) => p.status === "ready" || p.status === "error");

  const markConsented = useCallback(async () => {
    writeLocalConsent(token);
    setHasConsent(true);
    try {
      await fetch(`/api/public/memory-upload/${token}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestKey, consent: true }),
      });
    } catch {
      /* local consent still applies */
    }
  }, [guestKey, token]);

  function showError(message: string) {
    setError(message);
    window.requestAnimationFrame(() => {
      errorAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function checkGate(): string | null {
    if (!windowOpen) return "Uploads aren’t open for this event right now.";
    if (!consentOk) return "Please accept the consent checkbox to continue.";
    if (!allowAnonymousUploads && !name.trim()) return "Please enter your name.";
    return null;
  }

  function addPhotoFiles(list: FileList | File[]) {
    const gate = checkGate();
    if (gate) {
      showError(gate);
      return;
    }
    const incoming = Array.from(list).filter(isProbablyImage);
    if (!incoming.length) {
      showError("Please choose photo files from your camera roll.");
      return;
    }
    if (photoSlotsLeft <= 0) {
      showError(`You can upload up to ${maxPhotosPerGuest} photos.`);
      return;
    }

    const rawCap = Math.max(maxImageSizeMb, RAW_INTAKE_MAX_MB) * 1024 * 1024;
    const staged: PhotoQueueItem[] = [];
    for (const file of incoming.slice(0, photoSlotsLeft)) {
      if (file.size > rawCap) {
        showError(
          `“${file.name}” is unusually large (${formatBytes(file.size)}). Please pick a smaller export.`
        );
        continue;
      }
      staged.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "preparing",
        progress: 0,
        originalBytes: file.size,
      });
    }
    if (!staged.length) return;
    setPhotos((prev) => [...prev, ...staged]);
    setError("");
    for (const item of staged) {
      void preparePhoto(item.id, item.file, item.previewUrl);
    }
  }

  async function preparePhoto(id: string, source: File, previewUrl: string) {
    const maxBytes = maxImageSizeMb * 1024 * 1024;
    try {
      const result = await smartCompressImage(source, MEMORY_VAULT_IMAGE_COMPRESSION);
      let nextBlob = result.blob;
      let nextFile = new File([nextBlob], compressedFileName(source.name, nextBlob), {
        type: nextBlob.type || "image/jpeg",
        lastModified: Date.now(),
      });

      // Still over event budget after smart compress — try a tighter pass.
      if (nextFile.size > maxBytes) {
        const tighter = await smartCompressImage(source, {
          ...MEMORY_VAULT_IMAGE_COMPRESSION,
          maxEdge: 1800,
          targetBytes: Math.min(
            MEMORY_VAULT_IMAGE_COMPRESSION.targetBytes ?? 2_800_000,
            maxBytes * 0.85
          ),
          minQuality: 0.7,
          minEdge: 960,
        });
        nextBlob = tighter.blob;
        nextFile = new File([nextBlob], compressedFileName(source.name, nextBlob), {
          type: nextBlob.type || "image/jpeg",
          lastModified: Date.now(),
        });
      }

      if (nextFile.size > maxBytes) {
        throw new Error(`Image exceeds ${maxImageSizeMb}MB limit.`);
      }

      const nextPreview = URL.createObjectURL(nextFile);
      setPhotos((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          if (p.previewUrl !== nextPreview) URL.revokeObjectURL(p.previewUrl);
          return {
            ...p,
            file: nextFile,
            previewUrl: nextPreview,
            status: "ready",
            originalBytes: result.originalBytes,
            error: undefined,
          };
        })
      );
    } catch {
      // Browser couldn't decode (common for HEIC on some desktops) — upload raw if under cap.
      if (source.size <= maxBytes) {
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, file: source, previewUrl, status: "ready", originalBytes: source.size }
              : p
          )
        );
        return;
      }
      const message = friendlyImageError(
        `We couldn’t optimize “${source.name}” under ${maxImageSizeMb}MB.`,
        maxImageSizeMb
      );
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "error", error: message } : p))
      );
      showError(message);
    }
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function uploadOne(item: PhotoQueueItem) {
    const gate = checkGate();
    if (gate) {
      showError(gate);
      return;
    }
    if (!hasConsent && consent) await markConsented();

    setPhotos((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, status: "uploading", progress: 0, error: undefined } : p))
    );

    try {
      const fd = new FormData();
      fd.append("token", token);
      fd.append("file", item.file);
      fd.append("consent", "true");
      fd.append("guestKey", guestKey);
      if (name) fd.append("uploaderName", name);
      if (caption) fd.append("caption", caption);

      const { ok, json } = await uploadFormDataWithProgress("/api/memories/upload", fd, (pct) => {
        setPhotos((prev) => prev.map((p) => (p.id === item.id ? { ...p, progress: pct } : p)));
      });
      if (!ok) throw new Error((json.error as string) || "Upload failed");

      setPhotos((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: "done", progress: 100 } : p)));
      setSuccessCount((n) => n + 1);
      await markConsented();
    } catch (e) {
      const message = friendlyImageError(e instanceof Error ? e.message : "Upload failed", maxImageSizeMb);
      setPhotos((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, status: "error", error: message, progress: 0 } : p))
      );
      showError(message);
    }
  }

  async function uploadAllReady() {
    const gate = checkGate();
    if (gate) {
      showError(gate);
      return;
    }
    if (!hasConsent && consent) await markConsented();
    const queue = photos.filter((p) => p.status === "ready" || p.status === "error");
    for (const item of queue) {
      // Sequential keeps mobile Safari stable; UI stays responsive per-file.
      // eslint-disable-next-line no-await-in-loop
      await uploadOne(item);
    }
  }

  function onVideoUploaded(_result: UploadedVideoResult) {
    setVideoSuccess((n) => n + 1);
    setError("");
    void markConsented();
  }

  const videoDisabled = !!checkGate();
  const shellStyle: CSSProperties = {
    ...themeVars,
    background: `linear-gradient(180deg, var(--memory-color-surface, #FAF8F4) 0%, var(--memory-color-surface-alt, #F1E8DC) 100%)`,
    color: "var(--memory-color-ink, #0F172A)",
    fontFamily: "var(--memory-font-body, inherit)",
  };

  return (
    <div className="memory-viewport-stage space-y-6 rounded-none sm:rounded-3xl sm:border sm:shadow-sm overflow-hidden" style={shellStyle}>
      <div className="space-y-6 px-0 sm:px-6 sm:py-6">
      <header className="text-center space-y-2 pt-2">
        <Camera className="h-10 w-10 mx-auto" style={{ color: "var(--memory-color-accent, #0B8A83)" }} />
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--memory-font-display, Georgia, serif)" }}
        >
          Upload Your Photos & Videos
        </h1>
        <p className="text-sm" style={{ color: "var(--memory-color-ink-muted, #64748b)" }}>
          Share memories from <strong>{eventTitle}</strong> hosted by {hostName}
        </p>
      </header>

      {!windowOpen && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          Uploads are not open at this time. Please check back later.
        </div>
      )}

      {(successCount > 0 || videoSuccess > 0) && (
        <div
          className="rounded-xl border p-4 flex items-start gap-3"
          style={{
            borderColor: "color-mix(in srgb, var(--memory-color-accent, #0B8A83) 35%, transparent)",
            background: "color-mix(in srgb, var(--memory-color-accent-soft, #d9f3f1) 55%, white)",
          }}
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "var(--memory-color-accent, #0B8A83)" }} />
          <div className="text-sm">
            <p className="font-medium">
              {successCount + videoSuccess}{" "}
              {successCount + videoSuccess === 1 ? "memory" : "memories"} received!
            </p>
            <p className="mt-1 opacity-90">
              {approvalRequired
                ? "Your memory may appear after organizer approval."
                : "It will show in the album shortly."}
            </p>
            {memoriesUrl ? (
              <a href={memoriesUrl} className="inline-block mt-2 underline font-medium">
                View Event Memories album
              </a>
            ) : null}
          </div>
        </div>
      )}

      <div
        className="space-y-4 rounded-2xl border p-5 shadow-sm"
        style={{
          background: "color-mix(in srgb, var(--memory-color-surface, #fff) 92%, white)",
          borderColor: "var(--memory-color-border, #e5e7eb)",
          borderRadius: "var(--memory-radius, 18px)",
        }}
      >
        <div className="sticky top-0 z-10 space-y-1 py-1" style={{ background: "inherit" }}>
          <Label>Your name {allowAnonymousUploads ? "(optional)" : "*"}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" className="min-h-11" />
        </div>

        <div className="space-y-1">
          <Label>Caption (optional)</Label>
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="A moment from the celebration..."
            className="min-h-11"
          />
        </div>

        {!hasConsent ? (
          <div className="flex items-start gap-3 rounded-xl border p-3" style={{ borderColor: "var(--memory-color-border, #e5e7eb)" }}>
            <input
              id="consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-5 w-5 rounded"
            />
            <Label htmlFor="consent" className="text-xs leading-relaxed cursor-pointer" style={{ color: "var(--memory-color-ink-muted, #475569)" }}>
              I consent to sharing this media for this event only. I understand uploads may be moderated before appearing publicly.
            </Label>
          </div>
        ) : (
          <p className="text-xs" style={{ color: "var(--memory-color-ink-muted, #64748b)" }}>
            Consent saved for this event — you won’t be asked again on this device.
          </p>
        )}

        <div ref={errorAnchorRef} />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {/* Photos */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) addPhotoFiles(e.dataTransfer.files);
          }}
          className={cn(
            "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
            !windowOpen && "opacity-50 pointer-events-none"
          )}
          style={{
            borderColor: dragOver ? "var(--memory-color-accent, #0B8A83)" : "var(--memory-color-border, #e5e7eb)",
            background: dragOver
              ? "color-mix(in srgb, var(--memory-color-accent-soft, #d9f3f1) 40%, transparent)"
              : "transparent",
          }}
        >
          <ImagePlus className="h-9 w-9 mx-auto mb-2 opacity-50" />
          <p className="text-sm mb-1 font-medium">Add photos</p>
          <p className="text-xs mb-4" style={{ color: "var(--memory-color-ink-muted, #94a3b8)" }}>
            {photos.filter((p) => p.status !== "error").length}/{maxPhotosPerGuest} slots · any size or
            format · we optimize automatically
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              type="button"
              className="gap-2 min-h-12 px-5 touch-manipulation"
              style={{ background: "var(--memory-color-accent, #0B8A83)", color: "var(--memory-color-on-accent, #fff)" }}
              disabled={!windowOpen || photoSlotsLeft <= 0 || (!consentOk && !hasConsent)}
              onClick={() => photoInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" /> Add photos
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2 min-h-12 touch-manipulation"
              disabled={!windowOpen || photoSlotsLeft <= 0 || (!consentOk && !hasConsent)}
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-4 w-4" /> Camera
            </Button>
          </div>
        </div>

        <input
          ref={photoInputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addPhotoFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addPhotoFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {photos.length > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {photos.map((item) => (
                <div key={item.id} className="relative aspect-[4/5] rounded-xl overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                  {item.status === "preparing" ? (
                    <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center text-white text-xs gap-1">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Optimizing…
                    </div>
                  ) : null}
                  {item.status === "uploading" ? (
                    <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center text-white text-xs gap-1">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {item.progress}%
                    </div>
                  ) : null}
                  {item.status === "done" ? (
                    <div className="absolute inset-0 bg-emerald-900/35 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    </div>
                  ) : null}
                  {item.status === "error" ? (
                    <div className="absolute inset-0 bg-rose-900/50 flex flex-col items-center justify-center gap-1 p-1">
                      <button
                        type="button"
                        className="text-white text-[10px] underline"
                        onClick={() => void uploadOne(item)}
                      >
                        <RotateCcw className="h-4 w-4 mx-auto mb-0.5" /> Retry
                      </button>
                    </div>
                  ) : null}
                  {item.status !== "uploading" ? (
                    <button
                      type="button"
                      className="absolute top-1 right-1 rounded-full bg-black/55 p-1 text-white"
                      onClick={() => removePhoto(item.id)}
                      aria-label="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            {photos.some((p) => p.status === "error") ? (
              <p className="text-xs text-rose-600">
                {photos.find((p) => p.status === "error")?.error}
              </p>
            ) : null}
            <Button
              type="button"
              className="w-full min-h-12 gap-2"
              style={{ background: "var(--memory-color-accent, #0B8A83)", color: "var(--memory-color-on-accent, #fff)" }}
              disabled={uploading || preparing || !readyToShare}
              onClick={() => void uploadAllReady()}
            >
              {uploading || preparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {preparing ? "Optimizing photos…" : uploading ? "Uploading…" : "Share selected photos"}
            </Button>
          </div>
        ) : null}

        {/* Videos — MultiVideoUploader (chunked/resumable when S3 available) */}
        <div className="pt-2 border-t" style={{ borderColor: "var(--memory-color-border, #e5e7eb)" }}>
          <p className="text-xs mb-2" style={{ color: "var(--memory-color-ink-muted, #94a3b8)" }}>
            Up to {maxVideosPerGuest} · {maxVideoSizeMb}MB each
          </p>
          <MultiVideoUploader
            category="GUESTBOOK"
            guestToken={token}
            guestName={name || undefined}
            guestKey={guestKey}
            disabled={videoDisabled}
            allowCameraCapture
            maxFiles={maxVideosPerGuest}
            concurrency={1}
            buttonLabel="Add videos"
            hint={
              videoDisabled
                ? checkGate() ?? "Complete consent to add videos."
                : "Select or drag & drop videos — progress shows per file."
            }
            onUploaded={onVideoUploaded}
            onError={(msg) =>
              showError(
                /type|format|unsupported/i.test(msg)
                  ? "That video format couldn’t be processed. Try exporting as MP4 and upload again."
                  : msg
              )
            }
          />
        </div>
      </div>

      {(memoriesUrl || invitationUrl) && (
        <nav
          aria-label="Memory upload navigation"
          className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-center pb-8 pt-1"
        >
          {memoriesUrl ? (
            <a
              href={memoriesUrl}
              className={cn(
                "group inline-flex min-h-[52px] flex-1 items-center justify-center gap-2.5 rounded-2xl px-5",
                "text-[15px] font-semibold tracking-wide transition-[transform,box-shadow,filter] duration-200",
                "hover:brightness-[1.03] active:scale-[0.985]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              )}
              style={{
                background:
                  "linear-gradient(165deg, var(--memory-color-accent, #0B8A83) 0%, color-mix(in srgb, var(--memory-color-accent, #0B8A83) 78%, #064842) 100%)",
                color: "var(--memory-color-on-accent, #fff)",
                boxShadow:
                  "0 14px 32px -16px color-mix(in srgb, var(--memory-color-accent, #0B8A83) 70%, transparent), inset 0 1px 0 rgba(255,255,255,0.22)",
                outlineColor: "var(--memory-color-accent, #0B8A83)",
              }}
            >
              <Images className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
              <span>View approved memories</span>
            </a>
          ) : null}
          {invitationUrl ? (
            <a
              href={invitationUrl}
              className={cn(
                "group inline-flex min-h-[52px] flex-1 items-center justify-center gap-2.5 rounded-2xl border px-5",
                "text-[15px] font-semibold tracking-wide transition-[transform,background-color,border-color] duration-200",
                "hover:brightness-[1.02] active:scale-[0.985]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              )}
              style={{
                borderColor:
                  "color-mix(in srgb, var(--memory-color-accent, #0B8A83) 45%, var(--memory-color-border, #d6d3d1))",
                background:
                  "color-mix(in srgb, var(--memory-color-surface, #fff) 88%, white)",
                color: "var(--memory-color-accent, #0B8A83)",
                boxShadow: "0 10px 28px -20px rgba(15, 23, 42, 0.45)",
                outlineColor: "var(--memory-color-accent, #0B8A83)",
              }}
            >
              <ArrowLeft
                className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5"
                aria-hidden
              />
              <span>Back to invitation</span>
            </a>
          ) : null}
        </nav>
      )}
      </div>
    </div>
  );
}
