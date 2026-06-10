"use client";

import type { TemplateBlock, TemplateCanvas as CanvasConfig, TemplateRenderContext } from "@/types/template-engine";
import { personalizeText } from "@/lib/template-variables";
import { QrBlock } from "./qr-block";

interface TemplateCanvasProps {
  canvas: CanvasConfig;
  blocks: TemplateBlock[];
  context?: TemplateRenderContext;
  scale?: number;
  interactive?: boolean;
  onSelectBlock?: (blockId: string) => void;
  selectedBlockId?: string;
  onDragBlock?: (blockId: string, x: number, y: number) => void;
}

export function TemplateCanvas({
  canvas,
  blocks,
  context = {},
  scale = 0.35,
  interactive,
  onSelectBlock,
  selectedBlockId,
  onDragBlock,
}: TemplateCanvasProps) {
  const sorted = [...blocks].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  function resolveText(block: TemplateBlock) {
    if (block.content) return personalizeText(block.content, context);
    if (block.variable) return personalizeText(block.variable, context);
    return "";
  }

  function handleMouseDown(e: React.MouseEvent, block: TemplateBlock) {
    if (!interactive || !onDragBlock) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = block.x;
    const origY = block.y;

    function onMove(ev: MouseEvent) {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      onDragBlock?.(block.id, Math.round(origX + dx), Math.round(origY + dy));
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <div
      className="relative mx-auto shadow-2xl overflow-hidden rounded-lg"
      style={{
        width: canvas.width * scale,
        height: canvas.height * scale,
        background: canvas.background,
        backgroundImage: canvas.backgroundImage ? `url(${canvas.backgroundImage})` : undefined,
        backgroundSize: "cover",
      }}
    >
      {sorted.filter((b) => b.visible !== false).map((block) => {
        const text = resolveText(block);
        const isSelected = selectedBlockId === block.id;
        const baseStyle: React.CSSProperties = {
          position: "absolute",
          left: block.x * scale,
          top: block.y * scale,
          zIndex: block.zIndex ?? 1,
          outline: isSelected ? "2px solid #6366F1" : undefined,
          cursor: interactive ? (onDragBlock ? "grab" : "pointer") : undefined,
        };

        if (block.type === "text") {
          return (
            <div
              key={block.id}
              onMouseDown={(e) => { onSelectBlock?.(block.id); handleMouseDown(e, block); }}
              onClick={() => interactive && onSelectBlock?.(block.id)}
              style={{
                ...baseStyle,
                transform: block.align === "center" || !block.align ? "translateX(-50%)" : undefined,
                fontFamily: block.font,
                fontSize: (block.fontSize ?? 24) * scale,
                color: block.color ?? "#fff",
                textAlign: block.align ?? "center",
                whiteSpace: "nowrap",
                maxWidth: canvas.width * scale * 0.9,
              }}
            >
              {text}
            </div>
          );
        }

        if (block.type === "qr") {
          const size = (block.size ?? 120) * scale;
          const qrValue = context.qr_code || context.rsvp_link || "https://celeventic.com";
          return (
            <div
              key={block.id}
              onMouseDown={(e) => { onSelectBlock?.(block.id); handleMouseDown(e, block); }}
              style={{ ...baseStyle, width: size, height: size }}
            >
              <QrBlock value={qrValue} size={size} />
            </div>
          );
        }

        if (block.type === "rsvp_button") {
          return (
            <div
              key={block.id}
              onMouseDown={(e) => { onSelectBlock?.(block.id); handleMouseDown(e, block); }}
              style={{
                ...baseStyle,
                transform: "translateX(-50%)",
                width: (block.width ?? 200) * scale,
                height: (block.height ?? 48) * scale,
                background: "linear-gradient(135deg, #6366F1, #4F46E5)",
                color: "#fff",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12 * scale,
                fontWeight: 600,
                boxShadow: "0 4px 14px rgba(11,138,131,0.35)",
              }}
            >
              RSVP
            </div>
          );
        }

        if (block.type === "divider") {
          return (
            <div
              key={block.id}
              onMouseDown={(e) => { onSelectBlock?.(block.id); handleMouseDown(e, block); }}
              style={{ ...baseStyle, width: (block.width ?? 200) * scale, height: (block.height ?? 2) * scale, background: block.color ?? "#FBBF24" }}
            />
          );
        }

        if (block.type === "frame" || block.type === "pattern_overlay") {
          return (
            <div
              key={block.id}
              onMouseDown={(e) => { onSelectBlock?.(block.id); handleMouseDown(e, block); }}
              style={{
                ...baseStyle,
                width: (block.width ?? 100) * scale,
                height: (block.height ?? 100) * scale,
                border: `2px solid ${block.color ?? "#FBBF24"}`,
                borderRadius: block.type === "frame" ? 4 : 0,
                opacity: 0.6,
                pointerEvents: interactive ? "auto" : "none",
              }}
            />
          );
        }

        if (block.type === "image" || block.type === "logo") {
          const w = (block.width ?? 120) * scale;
          const h = (block.height ?? 120) * scale;
          const src = block.content;
          return (
            <div
              key={block.id}
              onMouseDown={(e) => { onSelectBlock?.(block.id); handleMouseDown(e, block); }}
              style={{ ...baseStyle, width: w, height: h }}
            >
              {src ? (
                <img src={src} alt={block.key} className="w-full h-full object-contain rounded" />
              ) : (
                <div className="w-full h-full bg-slate-200 border border-slate-300 rounded flex items-center justify-center text-slate-500" style={{ fontSize: 10 * scale }}>
                  {block.type === "logo" ? "LOGO" : "IMAGE"}
                </div>
              )}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
