"use client";

import { useEffect } from "react";
import { CELEYOU_PLATE_FILE_NAME, pickLivePlateElement } from "@/lib/digital-business-card/live-plate";

function asPlateFile(blob: Blob | File | null | undefined): File | null {
  if (!blob || blob.size < 64) return null;
  if (blob instanceof File && blob.name === CELEYOU_PLATE_FILE_NAME) return blob;
  return new File([blob], CELEYOU_PLATE_FILE_NAME, { type: "image/png" });
}

async function waitForPlateImages(node: HTMLElement) {
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        })
    )
  );
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 400))]);
  }
}

/** Rasterize the on-screen ID-1 plate. This is the cardholder's live face, not the site logo. */
export async function captureLivePlateFile(root?: ParentNode | null): Promise<File | null> {
  if (typeof document === "undefined") return null;
  const node = pickLivePlateElement(root ?? document);
  if (!node) return null;
  try {
    await waitForPlateImages(node);
    const { toBlob } = await import("html-to-image");
    const pixelRatio = Math.min(2.5, Math.max(2, window.devicePixelRatio || 2));
    const blob = await Promise.race([
      toBlob(node, {
        pixelRatio,
        cacheBust: true,
        filter: (el) => !el.classList?.contains("celecard-tap-hint"),
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2800)),
    ]);
    return asPlateFile(blob);
  } catch {
    return null;
  }
}

export async function persistLivePlateSnapshot(cardId: string, file: File): Promise<void> {
  if (!cardId || file.size < 64) return;
  const body = new FormData();
  body.append("file", file, CELEYOU_PLATE_FILE_NAME);
  await fetch(`/api/digital-business-cards/${encodeURIComponent(cardId)}/plate-snapshot`, {
    method: "POST",
    body,
    credentials: "same-origin",
  }).catch(() => undefined);
}

/** Owner studio: keep OG unfurl on the same live plate the cardholder sees. */
export function usePersistLivePlateSnapshot(cardId?: string | null, signature?: string | null) {
  useEffect(() => {
    if (!cardId) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void captureLivePlateFile()
        .then((file) => {
          if (!file || cancelled) return;
          return persistLivePlateSnapshot(cardId, file);
        })
        .catch(() => undefined);
    }, 900);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cardId, signature]);
}
