"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Camera,
  CheckCircle2,
  ImagePlus,
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
  status: "ready" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
};

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif";

function friendlyImageError(message: string, maxMb: number): string {
  const lower = message.toLowerCase();
  if (lower.includes("large") || lower.includes("size")) {
    return `That photo is too large. Please choose one under ${maxMb}MB.`;
  }
  if (lower.includes("type") || lower.includes("unsupported")) {
    return "That photo format isn’t supported. Try JPEG or PNG.";
  }
  return message || "We couldn’t upload that photo. Please try again.";
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
  const [phone, setPhone] = useState("");
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
    const incoming = Array.from(list).filter((f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name));
    if (!incoming.length) {
      showError("Please choose photo files (JPEG, PNG, or WebP).");
      return;
    }
    if (photoSlotsLeft <= 0) {
      showError(`You can upload up to ${maxPhotosPerGuest} photos.`);
      return;
    }

    const accepted: PhotoQueueItem[] = [];
    for (const file of incoming.slice(0, photoSlotsLeft)) {
      if (file.size > maxImageSizeMb * 1024 * 1024) {
        showError(`“${file.name}” is too large. Max ${maxImageSizeMb}MB per photo.`);
        continue;
      }
      accepted.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "ready",
        progress: 0,
      });
    }
    if (accepted.length) setPhotos((prev) => [...prev, ...accepted]);
    setError("");
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
      if (phone) fd.append("uploaderPhone", phone);
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
        <div className="grid sm:grid-cols-2 gap-3 sticky top-0 z-10 py-1" style={{ background: "inherit" }}>
          <div className="space-y-1">
            <Label>Your name {allowAnonymousUploads ? "(optional)" : "*"}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Guest name" className="min-h-11" />
          </div>
          <div className="space-y-1">
            <Label>Phone (optional)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233..." className="min-h-11" />
          </div>
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
            {photos.filter((p) => p.status !== "error").length}/{maxPhotosPerGuest} slots · up to {maxImageSizeMb}MB each
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
              disabled={uploading || !photos.some((p) => p.status === "ready" || p.status === "error")}
              onClick={() => void uploadAllReady()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading…" : "Share selected photos"}
            </Button>
          </div>
        ) : null}

        {/* Videos — MultiVideoUploader (chunked/resumable when S3 available) */}
        <div className="pt-2 border-t" style={{ borderColor: "var(--memory-color-border, #e5e7eb)" }}>
          <p className="text-xs mb-2" style={{ color: "var(--memory-color-ink-muted, #94a3b8)" }}>
            Videos · up to {maxVideosPerGuest} · {maxVideoSizeMb}MB each · phone, DSLR, WhatsApp/TikTok/Instagram
            exports and screen recordings (including iPhone HEVC) are accepted and processed for playback.
          </p>
          <MultiVideoUploader
            category="GUESTBOOK"
            guestToken={token}
            guestName={name || undefined}
            guestPhone={phone || undefined}
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

      <div className="flex flex-col sm:flex-row gap-2 justify-center pb-8">
        {memoriesUrl ? (
          <Button variant="outline" asChild className="min-h-11">
            <a href={memoriesUrl}>View approved memories</a>
          </Button>
        ) : null}
        {invitationUrl ? (
          <Button variant="ghost" asChild className="min-h-11">
            <a href={invitationUrl}>Back to invitation</a>
          </Button>
        ) : null}
      </div>
      </div>
    </div>
  );
}
