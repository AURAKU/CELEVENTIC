import type { CeremonyRow, CeremonySection } from "@/lib/seating/ceremony-engine";
import { venueFeaturePreset } from "@/lib/seating/venue-feature-presets";
import type {
  SeatingPlanKind,
  StudioLayout,
  StudioTableConfig,
  StudioVenueElement,
} from "@/lib/seating/studio-types";

export type VenueMapExportInput = {
  planName: string;
  planType: SeatingPlanKind;
  layout: StudioLayout;
  tables?: StudioTableConfig[];
  ceremonyRows?: CeremonyRow[];
  /** Optional subtitle, e.g. event venue name. */
  subtitle?: string | null;
  /** Optional guest tip lines (navigation directions). */
  directions?: string[];
  /** Scale multiplier for PNG sharpness (1–3). */
  scale?: number;
};

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function expandBounds(bounds: Bounds, x: number, y: number, w = 0, h = 0) {
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x + w);
  bounds.maxY = Math.max(bounds.maxY, y + h);
}

function computeLayoutBounds(input: VenueMapExportInput): Bounds {
  const bounds: Bounds = { minX: 0, minY: 0, maxX: 480, maxY: 360 };
  let touched = false;

  for (const element of input.layout.elements ?? []) {
    expandBounds(bounds, element.x, element.y, element.width ?? 110, element.height ?? 56);
    touched = true;
  }

  if (input.planType === "CEREMONY") {
    for (const row of input.ceremonyRows ?? []) {
      const xs = row.chairs.map((chair) => chair.x ?? row.x ?? 0);
      const ys = row.chairs.map((chair) => chair.y ?? row.y ?? 0);
      const minX = Math.min(row.x ?? 0, ...xs);
      const minY = Math.min(row.y ?? 0, ...ys);
      const maxX = Math.max(row.x ?? 0, ...xs) + 40;
      const maxY = Math.max(row.y ?? 0, ...ys) + 44;
      expandBounds(bounds, minX, minY, maxX - minX, maxY - minY);
      touched = true;
    }
  } else {
    for (const table of input.tables ?? []) {
      expandBounds(bounds, table.x ?? 0, table.y ?? 0, 140, 140);
      touched = true;
    }
  }

  if (!touched) {
    return { minX: 0, minY: 0, maxX: 640, maxY: 420 };
  }

  const pad = 48;
  return {
    minX: bounds.minX - pad,
    minY: bounds.minY - pad,
    maxX: bounds.maxX + pad,
    maxY: bounds.maxY + pad,
  };
}

function renderVenueElement(element: StudioVenueElement): string {
  const preset = venueFeaturePreset(element.kind);
  const width = element.width ?? preset.width;
  const height = element.height ?? preset.height;
  const color = element.color?.trim() || preset.color;
  const rotation = element.rotation ?? 0;
  const cx = element.x + width / 2;
  const cy = element.y + height / 2;
  const transform = rotation
    ? ` transform="rotate(${rotation} ${cx} ${cy})"`
    : "";

  return `
    <g${transform}>
      <rect x="${element.x}" y="${element.y}" width="${width}" height="${height}" rx="14"
        fill="${color}18" stroke="${color}" stroke-width="2" />
      <text x="${element.x + width / 2}" y="${element.y + height / 2 - 4}"
        text-anchor="middle" font-size="11" font-weight="700" fill="${color}"
        font-family="Georgia, 'Times New Roman', serif">${escapeXml(element.label)}</text>
      <text x="${element.x + width / 2}" y="${element.y + height / 2 + 12}"
        text-anchor="middle" font-size="9" fill="#64748B"
        font-family="system-ui, sans-serif">${escapeXml(element.kind.replace(/_/g, " "))}</text>
    </g>
  `;
}

function renderCeremonyRow(row: CeremonyRow, section?: CeremonySection): string {
  const color = section?.color ?? "#0B8A83";
  const labelX = row.x ?? 0;
  const labelY = (row.y ?? 0) - 8;
  const chairs = row.chairs
    .map((chair) => {
      const x = chair.x ?? row.x ?? 0;
      const y = chair.y ?? row.y ?? 0;
      return `
        <g>
          <rect x="${x}" y="${y}" width="32" height="32" rx="6"
            fill="#FFFFFF" stroke="${color}" stroke-width="1.5" />
          <text x="${x + 16}" y="${y + 20}" text-anchor="middle" font-size="8" fill="#334155"
            font-family="system-ui, sans-serif">${escapeXml(chair.label)}</text>
        </g>
      `;
    })
    .join("");

  return `
    <g>
      <text x="${labelX}" y="${labelY}" font-size="11" font-weight="700" fill="#0F172A"
        font-family="system-ui, sans-serif">${escapeXml(row.label)}${
          section ? ` · ${escapeXml(section.name)}` : ""
        }</text>
      ${chairs}
    </g>
  `;
}

function renderTable(table: StudioTableConfig): string {
  const x = (table.x ?? 0) + 20;
  const y = (table.y ?? 0) + 20;
  const color = table.color ?? "#0B8A83";
  const seats = table.seatCount ?? table.capacity ?? 8;
  return `
    <g>
      <circle cx="${x + 50}" cy="${y + 50}" r="42" fill="${color}22" stroke="${color}" stroke-width="2.5" />
      <text x="${x + 50}" y="${y + 46}" text-anchor="middle" font-size="12" font-weight="700" fill="#0F172A"
        font-family="system-ui, sans-serif">${escapeXml(table.label)}</text>
      <text x="${x + 50}" y="${y + 62}" text-anchor="middle" font-size="10" fill="#64748B"
        font-family="system-ui, sans-serif">${seats} seats${table.zone ? ` · ${escapeXml(table.zone)}` : ""}</text>
    </g>
  `;
}

function renderLegend(
  sections: CeremonySection[],
  startY: number,
  width: number
): string {
  if (!sections.length) return "";
  const items = sections
    .slice(0, 10)
    .map((section, index) => {
      const x = 24 + (index % 5) * Math.max(110, width / 5);
      const y = startY + Math.floor(index / 5) * 22;
      return `
        <g>
          <rect x="${x}" y="${y}" width="12" height="12" rx="3" fill="${section.color}" />
          <text x="${x + 18}" y="${y + 10}" font-size="11" fill="#334155"
            font-family="system-ui, sans-serif">${escapeXml(section.name)}</text>
        </g>
      `;
    })
    .join("");
  return `
    <text x="24" y="${startY - 10}" font-size="12" font-weight="700" fill="#0F172A"
      font-family="system-ui, sans-serif">Zone legend</text>
    ${items}
  `;
}

export function buildVenueMapSvg(input: VenueMapExportInput): { svg: string; width: number; height: number } {
  const bounds = computeLayoutBounds(input);
  const contentW = Math.max(420, bounds.maxX - bounds.minX);
  const contentH = Math.max(280, bounds.maxY - bounds.minY);
  const headerH = 92;
  const directions = (input.directions ?? []).filter(Boolean).slice(0, 4);
  const legendSections =
    input.planType === "CEREMONY" ? input.layout.ceremonySections ?? [] : [];
  const legendH = legendSections.length ? 28 + Math.ceil(Math.min(legendSections.length, 10) / 5) * 22 : 0;
  const directionsH = directions.length ? 28 + directions.length * 18 : 0;
  const footerH = 36;
  const width = Math.round(contentW + 48);
  const height = Math.round(headerH + contentH + legendH + directionsH + footerH + 24);
  const offsetX = 24 - bounds.minX;
  const offsetY = headerH - bounds.minY;

  const elements = (input.layout.elements ?? []).map(renderVenueElement).join("");
  const seating =
    input.planType === "CEREMONY"
      ? (input.ceremonyRows ?? [])
          .map((row) => {
            const section = (input.layout.ceremonySections ?? []).find(
              (item) => item.id === row.sectionId
            );
            return renderCeremonyRow(row, section);
          })
          .join("")
      : (input.tables ?? []).map(renderTable).join("");

  const title =
    input.planType === "CEREMONY" ? "Ceremony venue map" : "Reception venue map";

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F8FAFC"/>
      <stop offset="100%" stop-color="#EEF6F5"/>
    </linearGradient>
    <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#E2E8F0" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="16" y="${headerH - 8}" width="${width - 32}" height="${contentH + 16}" rx="18"
    fill="#FFFFFF" stroke="#DDE7E5" stroke-width="1"/>
  <rect x="16" y="${headerH - 8}" width="${width - 32}" height="${contentH + 16}" rx="18" fill="url(#grid)" opacity="0.55"/>

  <text x="28" y="34" font-size="13" font-weight="700" letter-spacing="0.18em" fill="#0B8A83"
    font-family="system-ui, sans-serif">CELEVENTIC</text>
  <text x="28" y="58" font-size="22" font-weight="700" fill="#0F172A"
    font-family="Georgia, 'Times New Roman', serif">${escapeXml(input.planName || title)}</text>
  <text x="28" y="78" font-size="12" fill="#64748B"
    font-family="system-ui, sans-serif">${escapeXml(title)}${
      input.subtitle ? ` · ${escapeXml(input.subtitle)}` : ""
    }</text>

  <g transform="translate(${offsetX}, ${offsetY})">
    ${elements}
    ${seating}
  </g>

  ${renderLegend(legendSections, headerH + contentH + 28, width - 48)}

  ${
    directions.length
      ? `
    <text x="24" y="${headerH + contentH + legendH + 36}" font-size="12" font-weight="700" fill="#0F172A"
      font-family="system-ui, sans-serif">How to find your way</text>
    ${directions
      .map(
        (line, index) => `
      <text x="24" y="${headerH + contentH + legendH + 56 + index * 18}" font-size="11" fill="#475569"
        font-family="system-ui, sans-serif">${index + 1}. ${escapeXml(line)}</text>`
      )
      .join("")}
  `
      : ""
  }

  <text x="28" y="${height - 14}" font-size="10" fill="#94A3B8"
    font-family="system-ui, sans-serif">Guest navigation map · Share or print for the day</text>
</svg>`;

  return { svg, width, height };
}

export async function venueMapSvgToPngBlob(
  svg: string,
  width: number,
  height: number,
  scale = 2
): Promise<Blob> {
  const safeScale = Math.min(3, Math.max(1, scale));
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not render venue map image."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * safeScale);
    canvas.height = Math.round(height * safeScale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("PNG export failed."))),
        "image/png"
      );
    });
    return png;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function venueMapFilename(planName: string, planType: SeatingPlanKind): string {
  const slug = (planName || "venue-map")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  const kind = planType === "CEREMONY" ? "ceremony" : "reception";
  return `${slug || "venue"}-${kind}-map.png`;
}

export async function downloadVenueMapPng(input: VenueMapExportInput): Promise<void> {
  const { svg, width, height } = buildVenueMapSvg(input);
  const png = await venueMapSvgToPngBlob(svg, width, height, input.scale ?? 2);
  triggerBlobDownload(png, venueMapFilename(input.planName, input.planType));
}
