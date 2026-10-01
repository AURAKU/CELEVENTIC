"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Camera, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import {
  MEMORY_VAULT_IMAGE_COMPRESSION,
  smartCompressImage,
} from "@/lib/image/smart-compress";
import { SERAPHINE_LAYOUT_SLUG } from "@/lib/experience/aurelia-editorial";
import { liveAlbumPaths, type LiveAlbumItem } from "@/lib/memory/live-album";
import styles from "./live-album-experience.module.css";

const IMAGE_ACCEPT = "image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.avif";

async function prepareFile(file: File): Promise<File> {
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
    return new File([compressed.blob], `${stem}.${ext}`, { type: compressed.blob.type });
  } catch {
    return file;
  }
}

export function LiveAlbumExperience({
  invitationId,
  eventTitle,
  showLens = true,
  showGallery = true,
  compact = false,
}: {
  invitationId: string;
  eventTitle: string;
  showLens?: boolean;
  showGallery?: boolean;
  compact?: boolean;
}) {
  const { key, api } = liveAlbumPaths(invitationId);
  const [guestName, setGuestName] = useState("");
  const [items, setItems] = useState<LiveAlbumItem[]>([]);
  const [canModerate, setCanModerate] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingGallery, setLoadingGallery] = useState(showGallery);
  const [openId, setOpenId] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openItem = items.find((item) => item.id === openId) ?? null;

  const loadGallery = useCallback(async () => {
    if (!showGallery) return;
    setLoadingGallery(true);
    try {
      const res = await fetch(api, { cache: "no-store", credentials: "same-origin" });
      const json = (await res.json()) as {
        data?: { items?: LiveAlbumItem[]; canModerate?: boolean };
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Could not open the album.");
      setItems(json.data?.items ?? []);
      setCanModerate(Boolean(json.data?.canModerate));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the album.");
    } finally {
      setLoadingGallery(false);
    }
  }, [api, showGallery]);

  useEffect(() => {
    void loadGallery();
  }, [loadGallery]);

  useEffect(() => {
    if (!openItem) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenId(null);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [openItem]);

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    setBusy(true);
    let uploaded = 0;
    try {
      for (const file of Array.from(list)) {
        setStatus(`Saving ${file.name}…`);
        const prepared = await prepareFile(file);
        const form = new FormData();
        form.append("file", prepared);
        if (guestName.trim()) form.append("guestName", guestName.trim());
        const res = await fetch(api, { method: "POST", body: form });
        const json = (await res.json()) as { data?: LiveAlbumItem; error?: string };
        if (!res.ok || !json.data) throw new Error(json.error || "Could not save that memory.");
        setItems((prev) => [json.data!, ...prev.filter((item) => item.id !== json.data!.id)]);
        uploaded += 1;
      }
      setStatus(uploaded === 1 ? "Added to the shared album." : `${uploaded} memories added to the album.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that memory.");
      setStatus(null);
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = "";
    }
  };

  const removeItem = async (item: LiveAlbumItem) => {
    if (!canModerate) return;
    const confirmed = window.confirm(
      "Remove this photograph from the shared album? Guests will no longer see it."
    );
    if (!confirmed) return;
    setError(null);
    try {
      const res = await fetch(`${api}/${item.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "Could not remove that memory.");
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      setOpenId((current) => (current === item.id ? null : current));
      setStatus("Removed from the shared album.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove that memory.");
    }
  };

  return (
    <div className={`${styles.wrap} ${busy ? styles.busy : ""}`}>
      {showLens ? (
        <div className={styles.lens}>
          <label className={styles.nameField}>
            <span>Your name (optional)</span>
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              maxLength={80}
              placeholder="So the couple know who sent this"
              autoComplete="name"
            />
          </label>
          <div className={styles.fileRow}>
            <label className={`${styles.fileBtn} ${styles.fill}`}>
              <Camera size={14} aria-hidden />
              Use the lens
              <input
                ref={cameraRef}
                type="file"
                accept={IMAGE_ACCEPT}
                capture="environment"
                onChange={(e) => void onFiles(e.target.files)}
              />
            </label>
            <label className={`${styles.fileBtn} ${styles.ghost}`}>
              <ImagePlus size={14} aria-hidden />
              Choose from library
              <input
                type="file"
                accept={IMAGE_ACCEPT}
                multiple
                onChange={(e) => void onFiles(e.target.files)}
              />
            </label>
          </div>
          {status ? <p className={styles.status}>{status}</p> : null}
          {error ? <p className={`${styles.status} ${styles.statusError}`}>{error}</p> : null}
        </div>
      ) : null}

      {showGallery ? (
        loadingGallery && items.length === 0 ? (
          <p className={styles.empty}>
            <Loader2 size={16} className="inline animate-spin" aria-hidden /> Opening the album…
          </p>
        ) : items.length === 0 ? (
          <p className={styles.empty}>
            {compact
              ? "The album is waiting. Open the lens to add the first photograph."
              : `No photographs in ${eventTitle} yet. Open the lens to begin the album.`}
          </p>
        ) : (
          <div className={styles.grid} role="list">
            {items.map((item) => (
              <figure className={styles.tile} key={item.id} role="listitem">
                <button
                  type="button"
                  className={styles.tileOpen}
                  onClick={() => setOpenId(item.id)}
                  aria-label={
                    item.guestName
                      ? `Open memory from ${item.guestName}`
                      : "Open photograph"
                  }
                >
                  {item.mediaType === "video" ? (
                    <video src={item.url} muted playsInline preload="metadata" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={item.guestName ? `Memory from ${item.guestName}` : "Guest memory"}
                    />
                  )}
                </button>
                {canModerate ? (
                  <button
                    type="button"
                    className={styles.remove}
                    aria-label="Remove this photo from the album"
                    onClick={(event) => {
                      event.stopPropagation();
                      void removeItem(item);
                    }}
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                ) : null}
                {item.guestName ? <figcaption className={styles.caption}>{item.guestName}</figcaption> : null}
              </figure>
            ))}
          </div>
        )
      ) : null}

      {openItem ? (
        <div
          className={styles.stage}
          role="dialog"
          aria-modal="true"
          aria-label="Guest photograph"
          onClick={() => setOpenId(null)}
        >
          <button
            ref={closeRef}
            type="button"
            className={styles.stageClose}
            aria-label="Close photograph"
            onClick={() => setOpenId(null)}
          >
            <X size={22} aria-hidden />
            Close
          </button>
          <div
            className={styles.stageFrame}
            onClick={(event) => event.stopPropagation()}
          >
            {openItem.mediaType === "video" ? (
              <video src={openItem.url} controls autoPlay playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={openItem.url}
                alt={openItem.guestName ? `Memory from ${openItem.guestName}` : "Guest memory"}
              />
            )}
            {openItem.guestName ? <p className={styles.stageCaption}>{openItem.guestName}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function LiveAlbumPageShell({
  invitationId,
  eventTitle,
  openLens,
  identity,
  cssVars,
}: {
  invitationId: string;
  eventTitle: string;
  openLens: boolean;
  identity?: {
    title?: string | null;
    eyebrow?: string | null;
    subtitle?: string | null;
    lede?: string | null;
    logoUrl?: string | null;
    monogram?: string | null;
    layout?: string | null;
  } | null;
  cssVars?: CSSProperties;
}) {
  const title = identity?.title?.trim() || eventTitle;
  const eyebrow = identity?.eyebrow?.trim() || "Shared album";
  const lede =
    identity?.lede?.trim() ||
    (openLens
      ? "Open the lens to add a photograph. It appears in the shared album for everyone at this celebration."
      : "Photographs from the celebration, gathered in one album.");
  const isSeraphine = identity?.layout === SERAPHINE_LAYOUT_SLUG;

  return (
    <div
      className={`${styles.wrap} ${styles.page} ${isSeraphine ? styles.seraphine : ""}`}
      style={cssVars}
      data-album-layout={identity?.layout || undefined}
    >
      <div className={styles.pageInner}>
        {identity?.logoUrl ? (
          <div className={styles.brand}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={identity.logoUrl} alt={identity.monogram?.trim() || title} />
          </div>
        ) : identity?.monogram ? (
          <p className={styles.brandLetters}>{identity.monogram}</p>
        ) : null}
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h1 className={styles.title}>{title}</h1>
        {identity?.subtitle ? <p className={styles.dateLine}>{identity.subtitle}</p> : null}
        <div className={styles.rule} aria-hidden />
        <p className={styles.lede}>{lede}</p>
        <LiveAlbumExperience
          invitationId={invitationId}
          eventTitle={title}
          showLens={openLens}
          showGallery
        />
      </div>
    </div>
  );
}
