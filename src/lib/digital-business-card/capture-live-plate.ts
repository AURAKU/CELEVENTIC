"use client";

import { useEffect } from "react";
import { CELEYOU_PLATE_FILE_NAME, pickLivePlateElement } from "@/lib/digital-business-card/live-plate";

const STYLE_KEYS: Array<keyof CSSStyleDeclaration> = [
  "position",
  "display",
  "boxSizing",
  "width",
  "height",
  "maxWidth",
  "maxHeight",
  "minWidth",
  "minHeight",
  "top",
  "left",
  "right",
  "bottom",
  "margin",
  "padding",
  "overflow",
  "overflowX",
  "overflowY",
  "backgroundColor",
  "backgroundImage",
  "backgroundSize",
  "backgroundPosition",
  "backgroundRepeat",
  "color",
  "opacity",
  "border",
  "borderRadius",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "letterSpacing",
  "lineHeight",
  "textAlign",
  "textTransform",
  "whiteSpace",
  "objectFit",
  "objectPosition",
  "alignItems",
  "justifyContent",
  "flexDirection",
  "flexWrap",
  "flex",
  "flexGrow",
  "flexShrink",
  "gap",
  "zIndex",
  "visibility",
];

function asPlateFile(blob: Blob | File | null | undefined): File | null {
  if (!blob || blob.size < 64) return null;
  if (blob instanceof File && blob.name === CELEYOU_PLATE_FILE_NAME) return blob;
  return new File([blob], CELEYOU_PLATE_FILE_NAME, { type: blob.type || "image/png" });
}

async function waitForPlateImages(node: HTMLElement) {
  const images = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
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
    await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 250))]);
  }
}

function copyComputed(src: HTMLElement, dest: HTMLElement) {
  const cs = window.getComputedStyle(src);
  dest.removeAttribute("class");
  dest.style.cssText = "";
  for (const key of STYLE_KEYS) {
    const value = cs[key];
    if (typeof value === "string" && value) dest.style[key] = value;
  }
  dest.style.transform = "none";
  dest.style.filter = "none";
  dest.style.backdropFilter = "none";
  dest.style.mixBlendMode = "normal";
  dest.style.boxShadow = "none";
  dest.style.textShadow = "none";
  dest.style.maskImage = "none";
  dest.style.webkitMaskImage = "none";
}

function rasterizeImage(img: HTMLImageElement): string | null {
  if (!img.naturalWidth || !img.naturalHeight) return img.currentSrc || img.src || null;
  if ((img.currentSrc || img.src || "").startsWith("data:image/")) return img.currentSrc || img.src;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return img.currentSrc || img.src || null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return img.currentSrc || img.src || null;
  }
}

function flattenLivePlate(node: HTMLElement): HTMLElement {
  const clone = node.cloneNode(true) as HTMLElement;
  const srcNodes = [node, ...Array.from(node.querySelectorAll<HTMLElement>("*"))];
  const destNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];
  for (let i = 0; i < srcNodes.length && i < destNodes.length; i += 1) {
    const src = srcNodes[i];
    const dest = destNodes[i];
    const tag = src.tagName.toLowerCase();
    if (tag === "script" || tag === "style" || tag === "link" || tag === "video" || tag === "canvas" || tag === "iframe") {
      dest.remove();
      continue;
    }
    if (src.classList.contains("celecard-tap-hint")) {
      dest.remove();
      continue;
    }
    copyComputed(src, dest);
    if (src instanceof HTMLImageElement && dest instanceof HTMLImageElement) {
      const data = rasterizeImage(src);
      if (data) dest.src = data;
      dest.removeAttribute("srcset");
      dest.crossOrigin = "anonymous";
    }
  }
  const box = node.getBoundingClientRect();
  clone.style.position = "fixed";
  clone.style.left = "-12000px";
  clone.style.top = "0";
  clone.style.width = `${Math.round(box.width)}px`;
  clone.style.height = `${Math.round(box.height)}px`;
  clone.style.margin = "0";
  clone.style.zIndex = "-1";
  clone.style.pointerEvents = "none";
  clone.setAttribute("aria-hidden", "true");
  return clone;
}

/** Rasterize the on-screen ID-1 plate. This is the cardholder's live face, not the site logo. */
export async function captureLivePlateFile(root?: ParentNode | null): Promise<File | null> {
  if (typeof document === "undefined") return null;
  const node = pickLivePlateElement(root ?? document);
  if (!node) return null;
  let clone: HTMLElement | null = null;
  try {
    await waitForPlateImages(node);
    clone = flattenLivePlate(node);
    document.body.appendChild(clone);
    const { toBlob } = await import("html-to-image");
    const pixelRatio = Math.min(2, Math.max(1.5, window.devicePixelRatio || 2));
    const blob = await Promise.race([
      toBlob(clone, {
        pixelRatio,
        cacheBust: false,
        skipFonts: false,
        backgroundColor: window.getComputedStyle(node).backgroundColor || "#ffffff",
        style: { transform: "none", inset: "auto" },
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2200)),
    ]);
    return asPlateFile(blob);
  } catch {
    return null;
  } finally {
    clone?.remove();
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
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cardId, signature]);
}
