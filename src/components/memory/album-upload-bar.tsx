"use client";

import { useMemo, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2 } from "lucide-react";
import {
  MEMORY_VAULT_IMAGE_COMPRESSION,
  smartCompressImage,
} from "@/lib/image/smart-compress";
import { readOrCreateClientGuestKey } from "@/lib/memory/memory-guest-identity";

const IMAGE_ACCEPT = "image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.avif,.bmp,.tif,.tiff";

export interface AlbumUploadConfig {
  token: string;
  approvalRequired: boolean;
  allowAnonymousUploads: boolean;
  maxImageSizeMb: number;
  windowOpen: boolean;
}

async function preparePhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(file.name)) {
    return file;
  }
  try {
    const compressed = await smartCompressImage(file, MEMORY_VAULT_IMAGE_COMPRESSION);
    const ext = compressed.blob.type.includes("png")
      ? "png"
      : compressed.blob.type.includes("webp")
        ? "webp"
        : "jpg";
    const stem = file.name.replace(/\.[^.]+$/, "") || "memory";
    return new File([compressed.blob], `${stem}.${ext}`, { type: compressed.blob.type || "image/jpeg" });
  } catch {
    return file;
  }
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
    setBusy(true);
    setError(null);
    let saved = 0;
    let pending = false;
    try {
      for (const file of Array.from(list)) {
        setStatus(`Adding ${file.name}…`);
        const prepared = await preparePhoto(file);
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
      }
      setStatus(
        pending
          ? "Sent to the hosts. It appears here once they approve it."
          : saved === 1
            ? "Added to the album. Guests can like, comment, and download it."
            : `${saved} photos added. Guests can like, comment, and download them.`
      );
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that photo.");
      setStatus(null);
    } finally {
      setBusy(false);
      if (libraryRef.current) libraryRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
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
          Add photos
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
        accept={IMAGE_ACCEPT}
        multiple
        className="sr-only"
        onChange={(event) => void onFiles(event.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept={IMAGE_ACCEPT}
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
          ? `Up to ${upload.maxImageSizeMb}MB each. Guests can like, comment, and download. Only an admin or the organizer can remove a photo.`
          : "Photo uploads are closed for this celebration."}
      </p>
      {status ? (
        <p className="mt-2 text-sm" style={{ color: "var(--memory-color-ink, #1B365D)" }}>
          {status}
        </p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
