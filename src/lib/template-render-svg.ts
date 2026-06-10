import type { TemplateBlock, TemplateCanvas, TemplateRenderContext } from "@/types/template-engine";
import { personalizeText } from "@/lib/template-variables";

function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function blockText(block: TemplateBlock, ctx: TemplateRenderContext): string {
  if (block.content) return personalizeText(block.content, ctx);
  if (block.variable) return personalizeText(block.variable, ctx);
  return "";
}

function parseBackground(bg: string): { fill: string; gradient?: string } {
  if (bg.startsWith("linear-gradient") || bg.startsWith("radial-gradient")) {
    const colors = bg.match(/#[0-9A-Fa-f]{3,8}|rgb[a]?\([^)]+\)/g) ?? ["#6366F1", "#0F172A"];
    const id = `grad-${Math.random().toString(36).slice(2, 8)}`;
    return {
      fill: `url(#${id})`,
      gradient: `<linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${colors[0]}"/>
        <stop offset="100%" stop-color="${colors[1] ?? colors[0]}"/>
      </linearGradient>`,
    };
  }
  return { fill: bg };
}

export function renderTemplateToSvg(
  canvas: TemplateCanvas,
  blocks: TemplateBlock[],
  context: TemplateRenderContext = {}
): string {
  const sorted = [...blocks].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  const bg = parseBackground(canvas.background);
  const defs: string[] = [];
  if (bg.gradient) defs.push(bg.gradient);

  const elements = sorted
    .filter((b) => b.visible !== false)
    .map((block) => {
      const text = blockText(block, context);

      if (block.type === "text") {
        const anchor = block.align === "left" ? "start" : block.align === "right" ? "end" : "middle";
        const x = block.align === "left" ? block.x : block.align === "right" ? block.x : block.x;
        return `<text x="${x}" y="${block.y}" font-family="${escapeXml(block.font ?? "Inter")}" font-size="${block.fontSize ?? 24}" fill="${block.color ?? "#fff"}" text-anchor="${anchor}" dominant-baseline="middle">${escapeXml(text)}</text>`;
      }

      if (block.type === "qr") {
        const size = block.size ?? 120;
        return `<rect x="${block.x}" y="${block.y}" width="${size}" height="${size}" fill="#fff" stroke="#333" stroke-width="2" rx="4"/>
          <text x="${block.x + size / 2}" y="${block.y + size / 2}" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="#333">QR</text>`;
      }

      if (block.type === "rsvp_button") {
        const w = block.width ?? 200;
        const h = block.height ?? 48;
        return `<rect x="${block.x - w / 2}" y="${block.y}" width="${w}" height="${h}" fill="#6366F1" rx="8"/>
          <text x="${block.x}" y="${block.y + h / 2}" font-size="16" font-weight="600" fill="#fff" text-anchor="middle" dominant-baseline="middle">RSVP</text>`;
      }

      if (block.type === "divider") {
        return `<rect x="${block.x}" y="${block.y}" width="${block.width ?? 200}" height="${block.height ?? 2}" fill="${block.color ?? "#D4AF37"}"/>`;
      }

      if (block.type === "frame" || block.type === "pattern_overlay") {
        return `<rect x="${block.x}" y="${block.y}" width="${block.width ?? 100}" height="${block.height ?? 100}" fill="none" stroke="${block.color ?? "#D4AF37"}" stroke-width="2" opacity="0.7"/>`;
      }

      if (block.type === "image" || block.type === "logo") {
        const w = block.width ?? 120;
        const h = block.height ?? 120;
        const src = block.content ?? "";
        if (src.startsWith("http") || src.startsWith("/")) {
          return `<image href="${escapeXml(src)}" x="${block.x}" y="${block.y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
        }
        return `<rect x="${block.x}" y="${block.y}" width="${w}" height="${h}" fill="#E2E8F0" stroke="#94A3B8" stroke-width="1" rx="4"/>
          <text x="${block.x + w / 2}" y="${block.y + h / 2}" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="#64748B">${block.type === "logo" ? "LOGO" : "IMAGE"}</text>`;
      }

      return "";
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
  <defs>${defs.join("")}</defs>
  <rect width="100%" height="100%" fill="${bg.fill}"/>
  ${canvas.backgroundImage ? `<image href="${escapeXml(canvas.backgroundImage)}" width="100%" height="100%" preserveAspectRatio="xMidYMid slice"/>` : ""}
  ${elements}
</svg>`;
}
