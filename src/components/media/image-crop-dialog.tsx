"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, Check, Move, RotateCcw, FlipHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  CROP_ASPECT_OPTIONS,
  type CropAspectPreset,
  cropFrameSize,
  computePixelCrop,
  cropImageToBlob,
  getCropShape,
  getCropScales,
  clampCropOffset,
  imageToBlob,
  rotateImage90,
  flipImageHorizontal,
} from "@/lib/image/crop-utils";

interface ImageCropDialogProps {
  open: boolean;
  imageSrc: string;
  fileName?: string;
  defaultAspect?: CropAspectPreset;
  allowedAspects?: CropAspectPreset[];
  onClose: () => void;
  onConfirm: (blob: Blob, fileName: string) => void | Promise<void>;
}

const CONTAINER_W = 360;
const CONTAINER_H = 320;

export function ImageCropDialog({
  open,
  imageSrc,
  fileName = "image.jpg",
  defaultAspect = "4:5",
  allowedAspects,
  onClose,
  onConfirm,
}: ImageCropDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [aspect, setAspect] = useState<CropAspectPreset>(defaultAspect);
  const [workingSrc, setWorkingSrc] = useState(imageSrc);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [applying, setApplying] = useState(false);
  const [transforming, setTransforming] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const ownedUrls = useRef<string[]>([]);

  const aspects = allowedAspects
    ? CROP_ASPECT_OPTIONS.filter((a) => allowedAspects.includes(a.id))
    : CROP_ASPECT_OPTIONS;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setAspect(defaultAspect);
    setWorkingSrc(imageSrc);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    ownedUrls.current = [];
    const img = new Image();
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = imageSrc;
  }, [open, imageSrc, defaultAspect]);

  useEffect(() => {
    if (!open) return;
    const img = new Image();
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = workingSrc;
  }, [workingSrc, open]);

  const frame = cropFrameSize(CONTAINER_W, CONTAINER_H, aspect);
  const shape = getCropShape(aspect);
  const { containScale, coverScale } = getCropScales(natural.w, natural.h, CONTAINER_W, CONTAINER_H);
  const scale = containScale * Math.max(zoom, 0.25);
  const renderedW = natural.w * scale;
  const renderedH = natural.h * scale;
  const maxZoom = Math.max(3, coverScale / containScale + 1);

  const frameRadius =
    shape === "circle" ? "9999px" : shape === "rounded" ? "18px" : "2px";

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [offset]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !natural.w) return;
      const raw = {
        x: dragRef.current.ox + (e.clientX - dragRef.current.startX),
        y: dragRef.current.oy + (e.clientY - dragRef.current.startY),
      };
      const clamped = clampCropOffset(
        raw.x,
        raw.y,
        natural.w,
        natural.h,
        CONTAINER_W,
        CONTAINER_H,
        frame.width,
        frame.height,
        zoom
      );
      setOffset(clamped);
    },
    [natural.w, natural.h, frame.width, frame.height, zoom]
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  async function applyTransform(fn: (src: string) => Promise<string>) {
    setTransforming(true);
    try {
      const next = await fn(workingSrc);
      ownedUrls.current.push(next);
      setWorkingSrc(next);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    } finally {
      setTransforming(false);
    }
  }

  async function handleUseFullImage() {
    if (!natural.w) return;
    setApplying(true);
    try {
      const blob = await imageToBlob(workingSrc);
      await onConfirm(blob, fileName.includes(".") ? fileName : `image-${Date.now()}.jpg`);
      ownedUrls.current.forEach((u) => URL.revokeObjectURL(u));
      onClose();
    } finally {
      setApplying(false);
    }
  }

  async function handleApply() {
    if (!natural.w) return;
    setApplying(true);
    try {
      const crop = computePixelCrop(
        natural.w,
        natural.h,
        CONTAINER_W,
        CONTAINER_H,
        frame.width,
        frame.height,
        zoom,
        offset.x,
        offset.y
      );
      const blob = await cropImageToBlob(workingSrc, crop, { shape });
      const ext = shape !== "rect" ? "png" : fileName.includes(".") ? fileName.split(".").pop() : "jpg";
      await onConfirm(blob, `cropped-${Date.now()}.${ext === "png" ? "png" : "jpg"}`);
      ownedUrls.current.forEach((u) => URL.revokeObjectURL(u));
      onClose();
    } finally {
      setApplying(false);
    }
  }

  function handleClose() {
    ownedUrls.current.forEach((u) => URL.revokeObjectURL(u));
    onClose();
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center bg-black/70 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Crop image"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="flex w-full max-w-md max-h-[min(92dvh,720px)] flex-col rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
          <div className="min-w-0 pr-2">
            <p className="font-semibold text-slate-900">Crop & frame</p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Move className="h-3 w-3 shrink-0" /> Drag to reposition · pinch or zoom slider · pick any area
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 rounded-lg p-2 hover:bg-slate-100 touch-manipulation"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {aspects.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAspect(a.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors touch-manipulation",
                  aspect === a.id
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-brand-300"
                )}
              >
                {a.label}
              </button>
            ))}
          </div>

          <div
            className="relative mx-auto bg-slate-900 rounded-xl overflow-hidden select-none touch-none"
            style={{ width: CONTAINER_W, height: CONTAINER_H, maxWidth: "100%" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={workingSrc}
              alt=""
              draggable={false}
              className="absolute max-w-none pointer-events-none"
              style={{
                width: renderedW,
                height: renderedH,
                left: (CONTAINER_W - renderedW) / 2 + offset.x,
                top: (CONTAINER_H - renderedH) / 2 + offset.y,
              }}
            />
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                style={{
                  width: frame.width,
                  height: frame.height,
                  left: (CONTAINER_W - frame.width) / 2,
                  top: (CONTAINER_H - frame.height) / 2,
                  borderRadius: frameRadius,
                }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 flex-1 sm:flex-none"
              disabled={transforming}
              onClick={() => void applyTransform((s) => rotateImage90(s, "ccw"))}
            >
              <RotateCcw className="h-4 w-4" />
              Rotate
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 flex-1 sm:flex-none"
              disabled={transforming}
              onClick={() => void applyTransform(flipImageHorizontal)}
            >
              <FlipHorizontal className="h-4 w-4" />
              Flip
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1">
              <ZoomIn className="h-3.5 w-3.5" /> Zoom
            </Label>
            <input
              type="range"
              min={0.25}
              max={maxZoom}
              step={0.02}
              value={zoom}
              onChange={(e) => {
                const nextZoom = parseFloat(e.target.value);
                setZoom(nextZoom);
                setOffset((prev) =>
                  clampCropOffset(
                    prev.x,
                    prev.y,
                    natural.w,
                    natural.h,
                    CONTAINER_W,
                    CONTAINER_H,
                    frame.width,
                    frame.height,
                    nextZoom
                  )
                );
              }}
              className="w-full accent-brand-600"
            />
          </div>
        </div>

        <div className="shrink-0 border-t bg-white px-4 py-3 flex flex-col gap-2 safe-area-pb">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-slate-600"
            disabled={applying || transforming || !natural.w}
            onClick={() => void handleUseFullImage()}
          >
            Use full image (no crop)
          </Button>
          <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1 min-h-[44px]" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 gap-2 min-h-[44px]"
            disabled={applying || transforming || !natural.w}
            onClick={() => void handleApply()}
          >
            <Check className="h-4 w-4" />
            {applying ? "Saving…" : "Use this crop"}
          </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
