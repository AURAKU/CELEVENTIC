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
  type CropFrameRect,
  type CropResizeHandle,
  cropAspectRatio,
  cropFrameSize,
  computePixelCrop,
  cropImageToBlob,
  getCropShape,
  getCropScales,
  clampCropOffset,
  clampFrameRect,
  resizeFrameRect,
  minZoomToCoverFrame,
  imageToBlob,
  rotateImage90,
  flipImageHorizontal,
} from "@/lib/image/crop-utils";
import { extensionForBlob } from "@/lib/image/smart-compress";

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

type DragMode =
  | { kind: "pan"; startX: number; startY: number; ox: number; oy: number }
  | { kind: "move"; startX: number; startY: number; frame: CropFrameRect }
  | { kind: "resize"; handle: CropResizeHandle; startX: number; startY: number; frame: CropFrameRect };

const HANDLES: { id: CropResizeHandle; className: string }[] = [
  { id: "nw", className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" },
  { id: "ne", className: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" },
  { id: "sw", className: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" },
  { id: "se", className: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize" },
  { id: "n", className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize" },
  { id: "s", className: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize" },
  { id: "e", className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize" },
  { id: "w", className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize" },
];

function centeredFrame(aspect: CropAspectPreset, containerW: number, containerH: number): CropFrameRect {
  const size = cropFrameSize(containerW, containerH, aspect);
  return {
    x: (containerW - size.width) / 2,
    y: (containerH - size.height) / 2,
    width: size.width,
    height: size.height,
  };
}

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
  const [frame, setFrame] = useState<CropFrameRect>(() => centeredFrame(defaultAspect, CONTAINER_W, CONTAINER_H));
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [applying, setApplying] = useState(false);
  const [transforming, setTransforming] = useState(false);
  // Measured crop-surface size in real CSS px. The surface is styled to a
  // 360x320 target but shrinks on narrow screens (dialog padding, small
  // phones); without measuring, pointer deltas and the final pixel-crop math
  // would assume 360x320 while the box actually renders smaller, so drags
  // wouldn't track the cursor and the exported region wouldn't match what was
  // visibly selected.
  const [box, setBox] = useState({ w: CONTAINER_W, h: CONTAINER_H });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragMode | null>(null);
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const ownedUrls = useRef<string[]>([]);
  const frameRef = useRef(frame);
  frameRef.current = frame;

  const aspects = allowedAspects
    ? CROP_ASPECT_OPTIONS.filter((a) => allowedAspects.includes(a.id))
    : CROP_ASPECT_OPTIONS;

  const ratio = cropAspectRatio(aspect);
  const shape = getCropShape(aspect);
  const { containScale, coverScale } = getCropScales(natural.w, natural.h, box.w, box.h);
  const scale = containScale * Math.max(zoom, 0.25);
  const renderedW = natural.w * scale;
  const renderedH = natural.h * scale;
  const minZoom = natural.w
    ? minZoomToCoverFrame(natural.w, natural.h, box.w, box.h, frame.width, frame.height)
    : 1;
  const maxZoom = Math.max(4, coverScale / Math.max(containScale, 0.001) + 1.5);

  const frameRadius =
    shape === "circle" ? "9999px" : shape === "rounded" ? "18px" : "2px";

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
    // Measure the real rendered surface (it can be narrower than the 360px
    // target on small screens) so the initial frame is centered correctly.
    const rect = containerRef.current?.getBoundingClientRect();
    const w = rect && rect.width > 0 ? rect.width : CONTAINER_W;
    const h = rect && rect.height > 0 ? rect.height : CONTAINER_H;
    setBox({ w, h });
    setAspect(defaultAspect);
    setWorkingSrc(imageSrc);
    setFrame(centeredFrame(defaultAspect, w, h));
    setOffset({ x: 0, y: 0 });
    setZoom(1);
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

  // Track the crop surface across resizes/orientation changes (e.g. rotating
  // a phone mid-crop) so drag math and the final export always match what's
  // on screen — never trust the static 360x320 constants.
  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect || rect.width <= 0 || rect.height <= 0) return;
      setBox((prev) =>
        Math.abs(prev.w - rect.width) < 0.5 && Math.abs(prev.h - rect.height) < 0.5
          ? prev
          : { w: rect.width, h: rect.height }
      );
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    // Keep the existing selection valid (rather than re-centering it) when
    // the measured surface size changes after the initial mount.
    const next = clampFrameRect(frameRef.current, box.w, box.h, null);
    setFrame(next);
    setOffset((o) =>
      clampCropOffset(o.x, o.y, natural.w, natural.h, box.w, box.h, next.width, next.height, zoom, next.x, next.y)
    );
    // Only react to surface-size changes; frame/offset/zoom here are read via refs/latest state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box.w, box.h]);

  // Cover the frame by default so dragging the image always moves visible content.
  useEffect(() => {
    if (!natural.w) return;
    const nextMin = minZoomToCoverFrame(
      natural.w,
      natural.h,
      box.w,
      box.h,
      frame.width,
      frame.height
    );
    setZoom((z) => Math.max(z, nextMin));
    setOffset((prev) =>
      clampCropOffset(
        prev.x,
        prev.y,
        natural.w,
        natural.h,
        box.w,
        box.h,
        frame.width,
        frame.height,
        Math.max(zoom, nextMin),
        frame.x,
        frame.y
      )
    );
    // Only when natural dims or aspect-driven frame resets — not every frame drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natural.w, natural.h, aspect]);

  function resetFrameForAspect(next: CropAspectPreset) {
    const nextFrame = centeredFrame(next, box.w, box.h);
    setAspect(next);
    setFrame(nextFrame);
    if (natural.w) {
      const nextMin = minZoomToCoverFrame(
        natural.w,
        natural.h,
        box.w,
        box.h,
        nextFrame.width,
        nextFrame.height
      );
      setZoom(nextMin);
      setOffset(
        clampCropOffset(
          0,
          0,
          natural.w,
          natural.h,
          box.w,
          box.h,
          nextFrame.width,
          nextFrame.height,
          nextMin,
          nextFrame.x,
          nextFrame.y
        )
      );
    }
  }

  const applyOffsetClamp = useCallback(
    (ox: number, oy: number, z: number, f: CropFrameRect) =>
      clampCropOffset(
        ox,
        oy,
        natural.w,
        natural.h,
        box.w,
        box.h,
        f.width,
        f.height,
        z,
        f.x,
        f.y
      ),
    [natural.w, natural.h, box.w, box.h]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent, mode: "pan" | "move" | CropResizeHandle) => {
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);
      const f = frameRef.current;
      if (mode === "pan") {
        dragRef.current = { kind: "pan", startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
      } else if (mode === "move") {
        dragRef.current = { kind: "move", startX: e.clientX, startY: e.clientY, frame: f };
      } else {
        dragRef.current = {
          kind: "resize",
          handle: mode,
          startX: e.clientX,
          startY: e.clientY,
          frame: f,
        };
      }
    },
    [offset.x, offset.y]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || !natural.w) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;

      if (drag.kind === "pan") {
        setOffset(applyOffsetClamp(drag.ox + dx, drag.oy + dy, zoom, frameRef.current));
        return;
      }
      if (drag.kind === "move") {
        const next = clampFrameRect(
          {
            ...drag.frame,
            x: drag.frame.x + dx,
            y: drag.frame.y + dy,
          },
          box.w,
          box.h,
          null
        );
        setFrame(next);
        setOffset(applyOffsetClamp(offset.x, offset.y, zoom, next));
        return;
      }
      const next = resizeFrameRect(
        drag.frame,
        drag.handle,
        dx,
        dy,
        box.w,
        box.h,
        ratio
      );
      setFrame(next);
      const nextMin = minZoomToCoverFrame(
        natural.w,
        natural.h,
        box.w,
        box.h,
        next.width,
        next.height
      );
      const nextZoom = Math.max(zoom, nextMin);
      if (nextZoom !== zoom) setZoom(nextZoom);
      setOffset(applyOffsetClamp(offset.x, offset.y, nextZoom, next));
    },
    [natural.w, natural.h, zoom, offset.x, offset.y, ratio, applyOffsetClamp, box.w, box.h]
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 2) return;
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { dist, zoom };
    },
    [zoom]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 2 || !pinchRef.current || !natural.w) return;
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const factor = dist / Math.max(pinchRef.current.dist, 1);
      const nextZoom = Math.min(maxZoom, Math.max(minZoom, pinchRef.current.zoom * factor));
      setZoom(nextZoom);
      setOffset(applyOffsetClamp(offset.x, offset.y, nextZoom, frameRef.current));
    },
    [natural.w, maxZoom, minZoom, offset.x, offset.y, applyOffsetClamp]
  );

  const onTouchEnd = useCallback(() => {
    pinchRef.current = null;
  }, []);

  async function applyTransform(fn: (src: string) => Promise<string>) {
    setTransforming(true);
    try {
      const next = await fn(workingSrc);
      ownedUrls.current.push(next);
      setWorkingSrc(next);
      setOffset({ x: 0, y: 0 });
      setFrame(centeredFrame(aspect, box.w, box.h));
    } finally {
      setTransforming(false);
    }
  }

  async function handleUseFullImage() {
    if (!natural.w) return;
    setApplying(true);
    try {
      const blob = await imageToBlob(workingSrc);
      await onConfirm(blob, `image-${Date.now()}.${extensionForBlob(blob)}`);
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
        box.w,
        box.h,
        frame.width,
        frame.height,
        zoom,
        offset.x,
        offset.y,
        frame.x,
        frame.y
      );
      const blob = await cropImageToBlob(workingSrc, crop, { shape });
      await onConfirm(blob, `cropped-${Date.now()}.${extensionForBlob(blob)}`);
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
              <Move className="h-3 w-3 shrink-0" />
              Drag the frame · resize corners · pan the image · pinch to zoom
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
                onClick={() => resetFrameForAspect(a.id)}
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
            ref={containerRef}
            className="relative mx-auto bg-slate-900 rounded-xl overflow-hidden select-none touch-none"
            style={{ width: CONTAINER_W, height: CONTAINER_H, maxWidth: "100%" }}
            onPointerDown={(e) => onPointerDown(e, "pan")}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
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
                left: (box.w - renderedW) / 2 + offset.x,
                top: (box.h - renderedH) / 2 + offset.y,
              }}
            />
            <div
              className="absolute border-2 border-white pointer-events-auto shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
              style={{
                left: frame.x,
                top: frame.y,
                width: frame.width,
                height: frame.height,
                borderRadius: frameRadius,
              }}
              onPointerDown={(e) => onPointerDown(e, "move")}
            >
              {HANDLES.map((h) => (
                <span
                  key={h.id}
                  role="presentation"
                  className={cn(
                    "absolute z-10 h-3.5 w-3.5 rounded-full border-2 border-white bg-brand-600 shadow touch-manipulation",
                    h.className
                  )}
                  onPointerDown={(e) => onPointerDown(e, h.id)}
                />
              ))}
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
              min={minZoom}
              max={maxZoom}
              step={0.02}
              value={Math.max(zoom, minZoom)}
              onChange={(e) => {
                const nextZoom = parseFloat(e.target.value);
                setZoom(nextZoom);
                setOffset(applyOffsetClamp(offset.x, offset.y, nextZoom, frame));
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
