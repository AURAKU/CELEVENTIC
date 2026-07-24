"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Loader2, X, Video, Pause, Play, RotateCcw, AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  VIDEO_ACCEPT_ATTR,
  EXTENSION_MIME_MAP,
  type VideoCategory,
  type AllowedVideoExtension,
} from "@/lib/video/constants";
import { extractExtension } from "@/lib/video/validation";
import {
  xhrPutWithProgress,
  xhrPostFormWithProgress,
  postJson,
  formatBytes,
  runWithConcurrency,
} from "@/lib/video/upload-client";

export interface UploadedVideoResult {
  assetId: string;
  status: string;
  processedMp4Url: string | null;
  hlsUrl: string | null;
  posterUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
}

interface PresignResponse {
  data: { assetId: string; strategy: "single" | "multipart" | "local"; uploadUrl?: string; key: string };
}
interface MultipartCreateResponse {
  data: { uploadId: string; partSizeBytes: number; totalParts: number };
}
interface MultipartPartResponse {
  data: { url: string; partNumber: number };
}
interface AssetResponse {
  data: {
    id: string;
    status: string;
    processedMp4Url: string | null;
    hlsUrl: string | null;
    posterUrl: string | null;
    thumbnailUrl: string | null;
    durationSeconds: number | null;
    failureReason: string | null;
  };
}

type Phase = "idle" | "uploading" | "paused" | "finalizing" | "processing" | "ready" | "failed" | "cancelled";

export interface VideoUploaderProps {
  category: VideoCategory;
  eventId?: string;
  vendorId?: string;
  orderId?: string;
  guestToken?: string;
  guestName?: string;
  guestPhone?: string;
  mute?: boolean;
  role?: string;
  label?: string;
  hint?: string;
  buttonLabel?: string;
  disabled?: boolean;
  className?: string;
  previewUrl?: string | null;
  onClear?: () => void;
  onUploaded: (result: UploadedVideoResult) => void;
  onError?: (message: string) => void;
  /** Show a camera-capture affordance for mobile guests (screen recorders / DSLR uploads should omit this). */
  allowCameraCapture?: boolean;
}

const CONCURRENCY = 3;
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 15 * 60 * 1000;

export function VideoUploader({
  category,
  eventId,
  vendorId,
  orderId,
  guestToken,
  guestName,
  guestPhone,
  mute,
  role,
  label,
  hint,
  buttonLabel = "Upload video",
  disabled,
  className,
  previewUrl: initialPreviewUrl,
  onClear,
  onUploaded,
  onError,
  allowCameraCapture,
}: VideoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl ?? null);
  const [previewUnsupported, setPreviewUnsupported] = useState(false);
  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);

  const objectUrlRef = useRef<string | null>(null);
  const pausedRef = useRef(false);
  const cancelledRef = useRef(false);
  const abortFnsRef = useRef<Set<() => void>>(new Set());
  const uploadedPartsRef = useRef<Map<number, string>>(new Map());
  const partBytesRef = useRef<Map<number, number>>(new Map());
  const fileRef = useRef<File | null>(null);
  const assetIdRef = useRef<string | null>(null);
  const uploadIdRef = useRef<string | null>(null);
  const totalPartsRef = useRef(0);
  const partSizeRef = useRef(0);
  const contentTypeRef = useRef("application/octet-stream");

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const reportError = useCallback(
    (message: string) => {
      setError(message);
      setPhase("failed");
      onError?.(message);
    },
    [onError]
  );

  function resetForNewFile() {
    setError(null);
    setPreviewUnsupported(false);
    setProgress(0);
    cancelledRef.current = false;
    pausedRef.current = false;
    abortFnsRef.current.clear();
    uploadedPartsRef.current.clear();
    partBytesRef.current.clear();
    assetIdRef.current = null;
    uploadIdRef.current = null;
  }

  function abortInFlight() {
    for (const abort of abortFnsRef.current) abort();
    abortFnsRef.current.clear();
  }

  async function pollUntilReady(assetId: string) {
    setPhase("processing");
    const startedAt = Date.now();
    for (;;) {
      if (cancelledRef.current) return;
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      if (cancelledRef.current) return;

      const qs = guestToken ? `?guestToken=${encodeURIComponent(guestToken)}` : "";
      let res: AssetResponse;
      try {
        res = await postJsonLikeGet(`/api/uploads/video/${assetId}${qs}`);
      } catch {
        continue; // transient network error — keep polling
      }

      const asset = res.data;
      if (asset.status === "READY") {
        setPhase("ready");
        onUploaded({
          assetId: asset.id,
          status: asset.status,
          processedMp4Url: asset.processedMp4Url,
          hlsUrl: asset.hlsUrl,
          posterUrl: asset.posterUrl,
          thumbnailUrl: asset.thumbnailUrl,
          durationSeconds: asset.durationSeconds,
        });
        return;
      }
      if (asset.status === "FAILED" || asset.status === "CANCELLED") {
        reportError(asset.failureReason ?? "Video processing failed.");
        return;
      }
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        reportError("Video is taking longer than expected to process. It will finish in the background — check back shortly.");
        return;
      }
      // QUEUED / UPLOADED / PROCESSING — keep polling.
    }
  }

  async function uploadSingle(file: File, uploadUrl: string) {
    setPhase("uploading");
    await xhrPutWithProgress(
      uploadUrl,
      file,
      contentTypeRef.current,
      (loaded, total) => setProgress(Math.round((loaded / total) * 100)),
      (abort) => abortFnsRef.current.add(abort)
    );
    setPhase("finalizing");
    await postJson("/api/uploads/video/complete", { assetId: assetIdRef.current, guestToken });
  }

  function computeOverallProgress(totalBytes: number) {
    let done = 0;
    for (const bytes of partBytesRef.current.values()) done += bytes;
    setProgress(Math.min(99, Math.round((done / totalBytes) * 100)));
  }

  async function uploadMultipartParts(file: File) {
    setPhase("uploading");
    const totalParts = totalPartsRef.current;
    const partSize = partSizeRef.current;
    const pending = Array.from({ length: totalParts }, (_, i) => i + 1).filter(
      (n) => !uploadedPartsRef.current.has(n)
    );

    await runWithConcurrency(pending, CONCURRENCY, async (partNumber) => {
      if (pausedRef.current || cancelledRef.current) throw new DOMException("paused", "AbortError");
      const start = (partNumber - 1) * partSize;
      const end = Math.min(start + partSize, file.size);
      const blob = file.slice(start, end);

      const { data } = await postJson<MultipartPartResponse>("/api/uploads/video/multipart/part", {
        assetId: assetIdRef.current,
        guestToken,
        partNumber,
      });

      const { etag } = await xhrPutWithProgress(
        data.url,
        blob,
        contentTypeRef.current,
        (loaded) => {
          partBytesRef.current.set(partNumber, loaded);
          computeOverallProgress(file.size);
        },
        (abort) => abortFnsRef.current.add(abort)
      );
      if (!etag) throw new Error(`Upload succeeded but no ETag was returned for part ${partNumber}. Check S3 CORS ExposeHeaders.`);
      uploadedPartsRef.current.set(partNumber, etag);
      partBytesRef.current.set(partNumber, end - start);
      computeOverallProgress(file.size);
    });

    if (cancelledRef.current) return;
    if (pausedRef.current) {
      setPhase("paused");
      return;
    }

    setPhase("finalizing");
    const parts = Array.from(uploadedPartsRef.current.entries()).map(([partNumber, etag]) => ({ partNumber, etag }));
    await postJson("/api/uploads/video/multipart/complete", { assetId: assetIdRef.current, guestToken, parts });
  }

  /**
   * S3 isn't configured/usable on this environment — presign already told us to route the
   * raw bytes straight to our own server instead of a presigned S3 PUT. One request carries
   * the whole file; the server just persists it to disk and responds `202 QUEUED` (fast) —
   * ffmpeg transcoding runs in the background worker, so this always falls through to the
   * same polling loop the S3/multipart paths use. A same-request `READY`/`FAILED` is still
   * handled (idempotent replays of an already-finalized asset, or a fast synchronous
   * validation failure) but is no longer the expected common case for a fresh upload.
   */
  async function uploadLocalFallback(file: File) {
    setPhase("uploading");
    const form = new FormData();
    form.append("assetId", assetIdRef.current!);
    if (guestToken) form.append("guestToken", guestToken);
    form.append("file", file);

    const res = await xhrPostFormWithProgress<AssetResponse>(
      "/api/uploads/video/local",
      form,
      (loaded, total) => setProgress(Math.min(99, Math.round((loaded / total) * 100))),
      (abort) => abortFnsRef.current.add(abort),
      () => setPhase("processing")
    );

    const asset = res.data;
    if (asset.status === "READY") {
      setPhase("ready");
      setProgress(100);
      onUploaded({
        assetId: asset.id,
        status: asset.status,
        processedMp4Url: asset.processedMp4Url,
        hlsUrl: asset.hlsUrl,
        posterUrl: asset.posterUrl,
        thumbnailUrl: asset.thumbnailUrl,
        durationSeconds: asset.durationSeconds,
      });
      return;
    }
    if (asset.status === "FAILED" || asset.status === "CANCELLED") {
      reportError(asset.failureReason ?? "Video processing failed.");
      return;
    }
    // QUEUED (the expected response now) — poll the same generic status endpoint every other
    // upload strategy uses until the background worker flips this to READY/FAILED.
    await pollUntilReady(asset.id);
  }

  async function startUpload(file: File) {
    resetForNewFile();
    fileRef.current = file;
    setFileMeta({ name: file.name, size: file.size });

    const ext = extractExtension(file.name) as AllowedVideoExtension | null;
    const mimeType = file.type || (ext ? EXTENSION_MIME_MAP[ext] : "") || "application/octet-stream";
    contentTypeRef.current = mimeType;

    try {
      setPhase("uploading");
      const presign = await postJson<PresignResponse>("/api/uploads/video/presign", {
        category,
        filename: file.name,
        mimeType,
        sizeBytes: file.size,
        eventId,
        vendorId,
        orderId,
        guestToken,
        guestName,
        guestPhone,
        context: { role, mute },
      });
      assetIdRef.current = presign.data.assetId;

      if (presign.data.strategy === "local") {
        await uploadLocalFallback(file);
        return;
      }

      if (presign.data.strategy === "single") {
        await uploadSingle(file, presign.data.uploadUrl!);
      } else {
        const created = await postJson<MultipartCreateResponse>("/api/uploads/video/multipart/create", {
          assetId: assetIdRef.current,
          guestToken,
        });
        uploadIdRef.current = created.data.uploadId;
        totalPartsRef.current = created.data.totalParts;
        partSizeRef.current = created.data.partSizeBytes;
        await uploadMultipartParts(file);
      }

      if (cancelledRef.current || pausedRef.current) return;
      await pollUntilReady(assetIdRef.current!);
    } catch (err) {
      if (cancelledRef.current) {
        setPhase("cancelled");
        return;
      }
      if (pausedRef.current) {
        setPhase("paused");
        return;
      }
      reportError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  function handleFile(file: File) {
    setPreviewUnsupported(false);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreviewUrl(url);
    void startUpload(file);
  }

  function handlePause() {
    pausedRef.current = true;
    abortInFlight();
  }

  function handleResume() {
    const file = fileRef.current;
    if (!file) return;
    pausedRef.current = false;
    setPhase("uploading");
    void (async () => {
      try {
        await uploadMultipartParts(file);
        if (!cancelledRef.current && !pausedRef.current) await pollUntilReady(assetIdRef.current!);
      } catch (err) {
        if (!cancelledRef.current && !pausedRef.current) {
          reportError(err instanceof Error ? err.message : "Resume failed.");
        }
      }
    })();
  }

  function handleRetry() {
    const file = fileRef.current;
    if (!file) return;
    void startUpload(file);
  }

  async function handleCancel() {
    cancelledRef.current = true;
    pausedRef.current = false;
    abortInFlight();
    const assetId = assetIdRef.current;
    if (assetId) {
      try {
        await fetch(`/api/uploads/video/cancel?assetId=${encodeURIComponent(assetId)}${guestToken ? `&guestToken=${encodeURIComponent(guestToken)}` : ""}`, {
          method: "DELETE",
        });
      } catch {
        /* best-effort */
      }
    }
    setPhase("cancelled");
    setProgress(0);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl(null);
    onClear?.();
  }

  /**
   * Removes a finished (or pre-existing) video — the counterpart to `handleCancel` for videos
   * that already reached "ready" (cancel deliberately refuses those; see the cancel API route).
   * Matches the delete/remove affordance images already get via `ImageUploadCropper`'s `onClear`
   * button. Best-effort server-side cleanup: only fires the DELETE call when we actually know
   * the asset id from a completed upload in this session — a bare pre-existing `previewUrl`
   * (no local assetId) just clears the field, same as image removal does.
   */
  async function handleRemove() {
    const assetId = assetIdRef.current;
    cancelledRef.current = true;
    pausedRef.current = false;
    abortInFlight();

    if (assetId && phase === "ready") {
      try {
        const qs = guestToken ? `?guestToken=${encodeURIComponent(guestToken)}` : "";
        await fetch(`/api/uploads/video/${encodeURIComponent(assetId)}${qs}`, { method: "DELETE" });
      } catch {
        /* best-effort — the reference is cleared from the UI either way */
      }
    }

    setPhase("idle");
    setProgress(0);
    setError(null);
    setFileMeta(null);
    setPreviewUnsupported(false);
    fileRef.current = null;
    assetIdRef.current = null;
    uploadIdRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl(null);
    onClear?.();
  }

  const busy = phase === "uploading" || phase === "finalizing" || phase === "processing";

  return (
    <div className={cn("space-y-3", className)}>
      {label && <p className="text-sm font-medium text-slate-900">{label}</p>}

      {previewUrl && phase !== "cancelled" ? (
        <div className="rounded-xl border bg-white p-3 space-y-2">
          {previewUnsupported ? (
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 border border-dashed p-4 text-sm text-slate-600">
              <Video className="h-6 w-6 text-slate-400 shrink-0" />
              <div>
                <p className="font-medium text-slate-700">{fileMeta?.name ?? "Video selected"}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Your browser can&apos;t preview this format (common for iPhone/Android HEVC video) — it will still upload
                  and process normally.
                </p>
              </div>
            </div>
          ) : (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={previewUrl}
              className="w-full max-h-48 rounded-lg object-cover bg-black"
              muted
              playsInline
              controls={phase === "ready" || phase === "idle"}
              onError={() => setPreviewUnsupported(true)}
            />
          )}

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{fileMeta ? `${fileMeta.name} · ${formatBytes(fileMeta.size)}` : null}</span>
            <StatusBadge phase={phase} />
          </div>

          {busy && (
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600 transition-all"
                style={{ width: `${phase === "processing" || phase === "finalizing" ? 100 : progress}%` }}
              />
            </div>
          )}
          {error && (
            <p className="text-xs text-red-600 flex items-start gap-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {phase === "uploading" && totalPartsRef.current > 1 && (
              <Button type="button" size="sm" variant="outline" className="gap-1" onClick={handlePause}>
                <Pause className="h-3.5 w-3.5" /> Pause
              </Button>
            )}
            {phase === "paused" && (
              <Button type="button" size="sm" variant="outline" className="gap-1" onClick={handleResume}>
                <Play className="h-3.5 w-3.5" /> Resume
              </Button>
            )}
            {phase === "failed" && (
              <Button type="button" size="sm" variant="outline" className="gap-1" onClick={handleRetry}>
                <RotateCcw className="h-3.5 w-3.5" /> Retry
              </Button>
            )}
            {(busy || phase === "paused" || phase === "failed") && (
              <Button type="button" size="sm" variant="ghost" className="gap-1 text-red-600" onClick={handleCancel}>
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
            )}
            {(phase === "ready" || phase === "idle") && (
              <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => inputRef.current?.click()} disabled={disabled}>
                <Upload className="h-3.5 w-3.5" /> Replace video
              </Button>
            )}
            {(phase === "ready" || phase === "idle") && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="gap-1 text-red-600"
                onClick={handleRemove}
                disabled={disabled}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className={cn(
            "rounded-xl border-2 border-dashed p-5 text-center transition-colors",
            dragOver ? "border-brand-500 bg-brand-50/50" : "border-slate-200 bg-slate-50/50",
            disabled && "opacity-50 pointer-events-none"
          )}
        >
          <Video className="h-8 w-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm text-slate-600 mb-3">
            {hint ?? "Upload a video from your device — phone, DSLR, WhatsApp/TikTok/Instagram exports, or screen recordings all work."}
          </p>
          <Button type="button" variant="outline" className="gap-2 min-h-[44px] touch-manipulation" disabled={disabled} onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" /> {buttonLabel}
          </Button>
          <p className="text-[11px] text-slate-400 mt-2">
            or drag &amp; drop · MP4, MOV (incl. iPhone HEVC), WebM, AVI, MKV &amp; more
          </p>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={VIDEO_ACCEPT_ATTR}
        capture={allowCameraCapture ? "environment" : undefined}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function StatusBadge({ phase }: { phase: Phase }) {
  const map: Record<Phase, { label: string; className: string; icon?: React.ReactNode }> = {
    idle: { label: "", className: "" },
    uploading: { label: "Uploading", className: "text-brand-600" },
    paused: { label: "Paused", className: "text-amber-600" },
    finalizing: { label: "Finishing upload", className: "text-brand-600" },
    processing: { label: "Processing", className: "text-brand-600" },
    ready: { label: "Ready", className: "text-emerald-600" },
    failed: { label: "Failed", className: "text-red-600" },
    cancelled: { label: "Cancelled", className: "text-slate-500" },
  };
  const cfg = map[phase];
  if (!cfg.label) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", cfg.className)}>
      {phase === "ready" && <CheckCircle2 className="h-3.5 w-3.5" />}
      {(phase === "uploading" || phase === "finalizing" || phase === "processing") && (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      )}
      {cfg.label}
    </span>
  );
}

/** Tiny GET wrapper matching the `postJson` error-shape contract used elsewhere in this component. */
async function postJsonLikeGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `Request failed (${res.status})`);
  return json as T;
}
