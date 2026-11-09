"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
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
import { cn } from "@/lib/utils";
import { uploadFormDataWithProgress } from "@/lib/media/upload-with-progress";
import { MultiVideoUploader } from "@/components/media/multi-video-uploader";
import type { UploadedVideoResult } from "@/components/media/video-uploader";
import { MEMORY_VAULT_VIDEO_UPLOADS_ENABLED } from "@/lib/memory/memory-vault-policy";
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
import { ALBUM_CAMERA_ACCEPT, ALBUM_PHOTO_ACCEPT, isAlbumPhotoFile } from "@/lib/memory/album-photo-file";

type MemoryThemeVars = CSSProperties & Record<`--memory-${string}`, string>;

interface GuestMemoryUploadProps {
  token: string;
  eventTitle: string;
  hostName: string;
  subtitle?: string | null;
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

/** Accept anything the OS calls a photo. We normalize before upload. */
const IMAGE_ACCEPT = ALBUM_PHOTO_ACCEPT;

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
  return isAlbumPhotoFile(file);
}

function compressedFileName(originalName: string, blob: Blob): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "memory";
  return `${base}.${extensionForBlob(blob)}`;
}

const DISPLAY = "var(--memory-font-display, var(--font-cinzel), Cinzel, serif)";
const BODY = "var(--memory-font-body, var(--font-cormorant), Georgia, serif)";
const SCRIPT = "var(--memory-font-script, var(--font-great-vibes), 'Great Vibes', cursive)";
const INK = "var(--memory-color-ink, #1B365D)";
const MUTED = "var(--memory-color-ink-muted, #6E5257)";
const ACCENT = "var(--memory-color-accent, #C7A35A)";
const SURFACE = "var(--memory-color-surface, #FBF6EF)";

const GOLD_FRAME =
  "inset 0 0 0 1px color-mix(in srgb, var(--memory-color-accent, #C7A35A) 72%, transparent), inset 0 0 0 6px color-mix(in srgb, var(--memory-color-surface, #FBF6EF) 70%, transparent), inset 0 0 0 7px color-mix(in srgb, var(--memory-color-accent, #C7A35A) 38%, transparent), 0 18px 40px -30px rgba(27, 54, 93, 0.45)";

const GOLD_HAIRLINE =
  "inset 0 0 0 1px color-mix(in srgb, var(--memory-color-accent, #C7A35A) 55%, transparent)";

function DiamondRule() {
  return (
    <div className="mx-auto mt-3 flex items-center justify-center gap-3" aria-hidden>
      <span
        className="h-px w-10"
        style={{ background: "linear-gradient(90deg, transparent, var(--memory-color-accent, #C7A35A))" }}
      />
      <span className="h-1.5 w-1.5 rotate-45" style={{ background: ACCENT }} />
      <span
        className="h-px w-10"
        style={{ background: "linear-gradient(90deg, var(--memory-color-accent, #C7A35A), transparent)" }}
      />
    </div>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.18em]"
      style={{ color: MUTED, fontFamily: DISPLAY }}
    >
      {children}
    </label>
  );
}

function ThemeInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  maxLength,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
  maxLength?: number;
}) {
  return (
    <input
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      maxLength={maxLength}
      className="h-12 w-full rounded-full border bg-white/80 px-5 text-[1.08rem] outline-none transition-[box-shadow] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--memory-color-accent,#C7A35A)_28%,transparent)]"
      style={{
        borderColor: "color-mix(in srgb, var(--memory-color-accent, #C7A35A) 55%, transparent)",
        color: INK,
        fontFamily: BODY,
      }}
    />
  );
}

export function GuestMemoryUpload({
  token,
  eventTitle,
  hostName,
  subtitle,
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

      // Still over event budget after smart compress. Try a tighter pass.
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
      // Browser couldn't decode (common for HEIC on some desktops). Upload raw if under cap.
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
  const hostLine = (() => {
    const line = subtitle?.trim() || (hostName.trim() ? `Hosted by ${hostName.trim()}` : "");
    if (!line) return null;
    const named = line.replace(/^hosted by\s+/i, "").trim();
    if (named.localeCompare(eventTitle.trim(), undefined, { sensitivity: "accent" }) === 0) return null;
    return line;
  })();
  const pickerReady = windowOpen && photoSlotsLeft > 0 && (consentOk || hasConsent);
  const goldButton = {
    color: INK,
    background:
      "linear-gradient(135deg, color-mix(in srgb, var(--memory-color-accent, #C7A35A) 42%, white), var(--memory-color-accent, #C7A35A))",
    boxShadow: "0 12px 26px -14px color-mix(in srgb, var(--memory-color-accent, #C7A35A) 80%, #6B4E16)",
    fontFamily: DISPLAY,
  } as const;
  const outlineButton = {
    color: INK,
    background: "color-mix(in srgb, var(--memory-color-surface, #FFFDFA) 88%, white)",
    boxShadow: "inset 0 0 0 1px var(--memory-color-accent, #C7A35A)",
    fontFamily: DISPLAY,
  } as const;
  const shellStyle: CSSProperties = {
    ...themeVars,
    background: `linear-gradient(180deg, var(--memory-color-surface, #FBF6EF) 0%, color-mix(in srgb, var(--memory-color-surface, #FBF6EF) 86%, var(--memory-color-accent, #C7A35A)) 100%)`,
    color: INK,
    fontFamily: BODY,
  };

  return (
    <div className="memory-viewport-stage overflow-hidden px-0 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6" style={shellStyle}>
      <header
        className="mx-auto max-w-xl rounded-[1.35rem] px-6 pb-6 pt-7 text-center"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--memory-color-surface, #FFFDFA) 88%, white), var(--memory-color-surface, #FBF6EF))",
          boxShadow: GOLD_FRAME,
        }}
      >
        <p
          className="font-[family-name:var(--font-cinzel)] text-[clamp(0.72rem,2vw,0.82rem)] font-semibold uppercase tracking-[0.42em]"
          style={{ color: ACCENT, fontFamily: DISPLAY }}
        >
          The Album
        </p>
        <DiamondRule />
        <p
          className="mt-4 font-[family-name:var(--font-great-vibes)] text-[clamp(2.3rem,8vw,3.2rem)] leading-none"
          style={{ color: ACCENT, fontFamily: SCRIPT }}
        >
          Share a memory
        </p>
        <h1
          className="mt-3 font-[family-name:var(--font-cinzel)] text-[clamp(1.35rem,5.2vw,1.9rem)] font-semibold uppercase leading-[1.12] tracking-[0.12em]"
          style={{ fontFamily: DISPLAY, color: INK }}
        >
          {eventTitle}
        </h1>
        {hostLine ? (
          <p
            className="mt-2 font-[family-name:var(--font-cormorant)] text-[1.05rem] italic leading-snug"
            style={{ color: MUTED, fontFamily: BODY }}
          >
            {hostLine}
          </p>
        ) : null}
        <p
          className="mx-auto mt-3 max-w-[22rem] font-[family-name:var(--font-cormorant)] text-[clamp(1.05rem,2.6vw,1.2rem)] leading-relaxed"
          style={{ color: INK, fontFamily: BODY }}
        >
          Photographs from the celebration gather here. Add yours with the care of the invitation itself.
        </p>
      </header>

      {!windowOpen ? (
        <p
          className="mx-auto mt-5 max-w-xl rounded-[1.35rem] px-6 py-4 text-center text-[1.05rem]"
          style={{ color: INK, fontFamily: BODY, background: SURFACE, boxShadow: GOLD_HAIRLINE }}
        >
          Photo uploads are closed for this celebration.
        </p>
      ) : null}

      {successCount > 0 || videoSuccess > 0 ? (
        <div
          className="mx-auto mt-5 flex max-w-xl items-start gap-3 rounded-[1.35rem] px-5 py-4"
          style={{ background: SURFACE, boxShadow: GOLD_HAIRLINE, color: INK, fontFamily: BODY }}
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: ACCENT }} />
          <div className="text-[1.05rem] leading-relaxed">
            <p style={{ fontFamily: DISPLAY }} className="text-[0.78rem] uppercase tracking-[0.16em]">
              {successCount + videoSuccess} {successCount + videoSuccess === 1 ? "memory" : "memories"} received
            </p>
            <p className="mt-1">
              {approvalRequired
                ? "It appears in the album once the hosts approve it."
                : "It will show in the album shortly."}
            </p>
            {memoriesUrl ? (
              <a href={memoriesUrl} className="mt-2 inline-block underline underline-offset-4" style={{ color: ACCENT }}>
                View the album
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        className="mx-auto mt-5 max-w-xl space-y-5 rounded-[1.35rem] px-6 py-8"
        style={{
          background: "color-mix(in srgb, var(--memory-color-surface, #FFFDFA) 80%, white)",
          boxShadow: GOLD_HAIRLINE,
        }}
      >
        <div>
          <FieldLabel htmlFor="memory-guest-name">
            Your name {allowAnonymousUploads ? "(optional)" : ""}
          </FieldLabel>
          <ThemeInput
            id="memory-guest-name"
            value={name}
            onChange={setName}
            placeholder="So the couple know who sent this"
            autoComplete="name"
            maxLength={80}
          />
        </div>

        <div>
          <FieldLabel htmlFor="memory-caption">Caption (optional)</FieldLabel>
          <ThemeInput
            id="memory-caption"
            value={caption}
            onChange={setCaption}
            placeholder="A line for the couple, if you wish"
            maxLength={180}
          />
        </div>

        {!hasConsent ? (
          <label
            htmlFor="consent"
            className="flex cursor-pointer items-start gap-3 rounded-[1.15rem] px-4 py-3"
            style={{ boxShadow: GOLD_HAIRLINE }}
          >
            <input
              id="consent"
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded-sm"
              style={{ accentColor: ACCENT }}
            />
            <span className="text-[1.02rem] leading-relaxed" style={{ color: INK, fontFamily: BODY }}>
              I consent to sharing this media for this event only. I understand uploads may be moderated before
              appearing publicly.
            </span>
          </label>
        ) : (
          <p className="text-center text-[0.98rem] leading-relaxed" style={{ color: MUTED, fontFamily: BODY }}>
            Consent saved for this event. You will not be asked again on this device.
          </p>
        )}

        <div ref={errorAnchorRef} />
        {error ? (
          <p className="text-center text-[0.98rem]" style={{ color: "#9F1239", fontFamily: BODY }}>
            {error}
          </p>
        ) : null}

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            if (event.dataTransfer.files?.length) addPhotoFiles(event.dataTransfer.files);
          }}
          className={cn("rounded-[1.2rem] px-4 py-8 text-center transition-colors", !windowOpen && "pointer-events-none opacity-50")}
          style={{
            boxShadow: dragOver
              ? "inset 0 0 0 1.5px var(--memory-color-accent, #C7A35A)"
              : GOLD_HAIRLINE,
            background: dragOver
              ? "color-mix(in srgb, var(--memory-color-accent, #C7A35A) 12%, white)"
              : "color-mix(in srgb, var(--memory-color-surface, #FFFDFA) 70%, white)",
          }}
        >
          <ImagePlus className="mx-auto mb-2 h-8 w-8" style={{ color: ACCENT }} strokeWidth={1.5} />
          <p className="text-[1.7rem] leading-none" style={{ color: ACCENT, fontFamily: SCRIPT }}>
            Add photos
          </p>
          <p className="mx-auto mt-2 max-w-xs text-[1.02rem] leading-relaxed" style={{ color: INK, fontFamily: BODY }}>
            {photos.filter((photo) => photo.status !== "error").length} of {maxPhotosPerGuest} photos. Any format
            your phone can take. We prepare them for the album.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={!pickerReady}
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[0.72rem] uppercase tracking-[0.16em] disabled:opacity-60"
              style={goldButton}
              onClick={() => photoInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Add photos
            </button>
            <button
              type="button"
              disabled={!pickerReady}
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[0.72rem] uppercase tracking-[0.16em] disabled:opacity-60"
              style={outlineButton}
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-4 w-4" />
              Camera
            </button>
          </div>
        </div>

        <input
          ref={photoInputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files?.length) addPhotoFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept={ALBUM_CAMERA_ACCEPT}
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            if (event.target.files?.length) addPhotoFiles(event.target.files);
            event.target.value = "";
          }}
        />

        {photos.length > 0 ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {photos.map((item) => (
                <div
                  key={item.id}
                  className="relative aspect-[4/5] overflow-hidden rounded-[0.9rem]"
                  style={{ background: "color-mix(in srgb, var(--memory-color-accent, #C7A35A) 14%, white)", boxShadow: GOLD_HAIRLINE }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                  {item.status === "preparing" ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/45 text-xs text-white">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Preparing
                    </div>
                  ) : null}
                  {item.status === "uploading" ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/45 text-xs text-white">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {item.progress}%
                    </div>
                  ) : null}
                  {item.status === "done" ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--memory-color-accent,#C7A35A)_35%,transparent)]">
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    </div>
                  ) : null}
                  {item.status === "error" ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-rose-900/50 p-1">
                      <button type="button" className="text-[10px] text-white underline" onClick={() => void uploadOne(item)}>
                        <RotateCcw className="mx-auto mb-0.5 h-4 w-4" /> Retry
                      </button>
                    </div>
                  ) : null}
                  {item.status !== "uploading" ? (
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded-full bg-black/55 p-1 text-white"
                      onClick={() => removePhoto(item.id)}
                      aria-label="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            {photos.some((photo) => photo.status === "error") ? (
              <p className="text-center text-[0.95rem]" style={{ color: "#9F1239", fontFamily: BODY }}>
                {photos.find((photo) => photo.status === "error")?.error}
              </p>
            ) : null}
            <button
              type="button"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full text-[0.72rem] uppercase tracking-[0.16em] disabled:opacity-60"
              style={goldButton}
              disabled={uploading || preparing || !readyToShare}
              onClick={() => void uploadAllReady()}
            >
              {uploading || preparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {preparing ? "Preparing photos" : uploading ? "Adding to the album" : "Share selected photos"}
            </button>
          </div>
        ) : null}

        {MEMORY_VAULT_VIDEO_UPLOADS_ENABLED ? (
          <div className="pt-2" style={{ boxShadow: "inset 0 1px 0 color-mix(in srgb, var(--memory-color-accent, #C7A35A) 35%, transparent)" }}>
            <p className="mb-2 pt-4 text-center text-[0.68rem] uppercase tracking-[0.18em]" style={{ color: MUTED, fontFamily: DISPLAY }}>
              Films · up to {maxVideosPerGuest} · {maxVideoSizeMb}MB each
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
                  : "Select or drop films. Progress shows for each one."
              }
              onUploaded={onVideoUploaded}
              onError={(msg) =>
                showError(
                  /type|format|unsupported/i.test(msg)
                    ? "That video format could not be processed. Try exporting as MP4 and upload again."
                    : msg
                )
              }
            />
          </div>
        ) : null}
      </div>

      {memoriesUrl || invitationUrl ? (
        <nav
          aria-label="Memory upload navigation"
          className="mx-auto mt-6 flex max-w-xl flex-col gap-3 pb-2"
        >
          {memoriesUrl ? (
            <a
              href={memoriesUrl}
              className="inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2.5 rounded-full px-5 font-[family-name:var(--font-cinzel)] text-[clamp(0.72rem,1.5vw,0.84rem)] font-medium uppercase tracking-[0.16em] transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ ...goldButton, outlineColor: ACCENT }}
            >
              <Images className="h-4 w-4 shrink-0" aria-hidden />
              View the album
            </a>
          ) : null}
          {invitationUrl ? (
            <a
              href={invitationUrl}
              className="inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2.5 rounded-full px-5 font-[family-name:var(--font-cinzel)] text-[clamp(0.72rem,1.5vw,0.84rem)] font-medium uppercase tracking-[0.16em] transition-transform hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ ...outlineButton, outlineColor: ACCENT }}
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              Back to invitation
            </a>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
