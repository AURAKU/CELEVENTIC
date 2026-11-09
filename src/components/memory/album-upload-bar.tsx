"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2 } from "lucide-react";
import { readOrCreateClientGuestKey } from "@/lib/memory/memory-guest-identity";
import {
  ALBUM_CAMERA_ACCEPT,
  ALBUM_PHOTO_ACCEPT,
  compressAlbumPhoto,
  isAlbumPhotoFile,
} from "@/lib/memory/album-photo-file";

const UPLOAD_CONCURRENCY = 4;

export interface AlbumUploadConfig {
  token: string;
  approvalRequired: boolean;
  allowAnonymousUploads: boolean;
  maxImageSizeMb: number;
  windowOpen: boolean;
}

export function AlbumUploadBar({
  upload,
  onUploaded,
}: {
  upload: AlbumUploadConfig;
  onUploaded: () => void;
}) {
  const guestKey = useMemo(() => readOrCreateClientGuestKey(), []);
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(list: FileList | null) {
    if (!list?.length || !upload.windowOpen) return;
    if (!upload.allowAnonymousUploads && name.trim().length < 2) {
      setError("Add your name, then choose the photos.");
      setStatus(null);
      return;
    }

    const files = Array.from(list);
    const photos = files.filter(isAlbumPhotoFile);
    const skipped = files.length - photos.length;
    if (!photos.length) {
      setError("Choose a photo. JPEG, HEIC, PNG, WebP, GIF, AVIF, BMP, and similar formats all work.");
      setStatus(null);
      return;
    }

    setBusy(true);
    setError(
      skipped > 0
        ? skipped === 1
          ? "One file wasn’t a photo, so it was skipped."
          : `${skipped} files weren’t photos, so they were skipped.`
        : null
    );
    let saved = 0;
    let failed = 0;
    let pending = false;
    let nextIndex = 0;
    let firstFailure = "";

    async function worker() {
      while (true) {
        const i = nextIndex++;
        if (i >= photos.length) return;
        const file = photos[i]!;
        setStatus(
          photos.length === 1
            ? "Adding your photo…"
            : `Adding ${Math.min(saved + failed + 1, photos.length)} of ${photos.length}…`
        );
        try {
          const prepared = await compressAlbumPhoto(file);
          const body = new FormData();
          body.append("token", upload.token);
          body.append("file", prepared);
          body.append("consent", "true");
          body.append("guestKey", guestKey);
          if (name.trim()) body.append("uploaderName", name.trim());
          const res = await fetch("/api/memories/upload", { method: "POST", body });
          const json = (await res.json()) as { error?: string; data?: { status?: string } };
          if (!res.ok) throw new Error(json.error || "Could not add that photo.");
          if (json.data?.status === "PENDING") pending = true;
          saved += 1;
        } catch (cause) {
          failed += 1;
          if (!firstFailure && cause instanceof Error && cause.message) {
            firstFailure = cause.message;
          }
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(UPLOAD_CONCURRENCY, photos.length) }, () => worker())
    );

    if (saved > 0) {
      onUploaded();
      setStatus(
        pending
          ? "Sent to the hosts. It appears here once they approve it."
          : saved === 1
            ? "Added to the album. Guests can like, comment, and download it."
            : `${saved} photos added. Guests can like, comment, and download them.`
      );
    } else {
      setStatus(null);
    }
    if (failed > 0) {
      setError(
        saved > 0
          ? `${failed} photo${failed === 1 ? "" : "s"} could not be added. Try those again.`
          : firstFailure ||
              "Those photos could not be added. Try another shot or export as JPEG."
      );
    }

    setBusy(false);
    if (libraryRef.current) libraryRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  }

  const buttonStyle = {
    color: "var(--memory-color-ink, #1B365D)",
    background: "color-mix(in srgb, var(--memory-color-accent, #C7A35A) 88%, white)",
    boxShadow: "inset 0 0 0 1px var(--memory-color-accent, #C7A35A)",
    fontFamily: "var(--memory-font-display, var(--font-cinzel), Cinzel, serif)",
  } as const;

  return (
    <div className="mx-auto mt-4 max-w-3xl text-center">
      <label className="mx-auto block max-w-xs text-left">
        <span
          className="mb-1 block text-[0.68rem] uppercase tracking-[0.18em]"
          style={{
            color: "var(--memory-color-ink-muted, #6E5257)",
            fontFamily: "var(--memory-font-display, var(--font-cinzel), Cinzel, serif)",
          }}
        >
          Your name {upload.allowAnonymousUploads ? "(optional)" : ""}
        </span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          autoComplete="name"
          placeholder="So the couple know who sent this"
          className="h-11 w-full rounded-full border bg-white/80 px-4 text-[1.05rem] outline-none"
          style={{
            borderColor: "color-mix(in srgb, var(--memory-color-accent, #C7A35A) 55%, transparent)",
            color: "var(--memory-color-ink, #1B365D)",
            fontFamily: "var(--memory-font-body, var(--font-cormorant), Georgia, serif)",
          }}
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          disabled={busy || !upload.windowOpen}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[0.72rem] uppercase tracking-[0.16em] disabled:opacity-60"
          style={buttonStyle}
          onClick={() => libraryRef.current?.click()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {busy ? status || "Adding…" : "Add photos"}
        </button>
        <button
          type="button"
          disabled={busy || !upload.windowOpen}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[0.72rem] uppercase tracking-[0.16em] disabled:opacity-60"
          style={{
            ...buttonStyle,
            background: "transparent",
          }}
          onClick={() => cameraRef.current?.click()}
        >
          <Camera className="h-4 w-4" />
          Camera
        </button>
      </div>
      <input
        ref={libraryRef}
        type="file"
        accept={ALBUM_PHOTO_ACCEPT}
        multiple
        className="sr-only"
        onChange={(event) => void onFiles(event.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept={ALBUM_CAMERA_ACCEPT}
        capture="environment"
        className="sr-only"
        onChange={(event) => void onFiles(event.target.files)}
      />
      <p
        className="mx-auto mt-3 max-w-md text-[1.02rem] leading-relaxed"
        style={{
          color: "var(--memory-color-ink, #1B365D)",
          fontFamily: "var(--memory-font-body, var(--font-cormorant), Georgia, serif)",
        }}
      >
        {upload.windowOpen
          ? `Any photo your phone can take, including JPEG, HEIC, PNG, WebP, GIF, AVIF, and BMP. Up to ${upload.maxImageSizeMb}MB each. Guests can like, comment, and download. Only an admin or the organizer can remove a photo.`
          : "Photo uploads are closed for this celebration."}
      </p>
      {status && !busy ? (
        <p className="mt-2 text-sm" style={{ color: "var(--memory-color-ink, #1B365D)" }}>
          {status}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
