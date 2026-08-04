/**
 * Server-side Vendor & Team Access Card PNG.
 * Portrait badge sized for phone save / print — Celeventic teal · gold · ivory.
 */

import sharp from "sharp";
import { readFile } from "fs/promises";
import path from "path";
import { generateBrandedQrPng } from "@/lib/qr/branded-qr-generator";
import { CELEVENTIC_LOGO_MARK, CELEVENTIC_OFFICIAL_LOGO } from "@/lib/qr/qr-constants";
import { formatAdmissionCode } from "@/lib/admission/pass-code";
import { CELEVENTIC_PALETTE } from "@/lib/experience/celeventic-palette";

const CARD_W = 1080;
const CARD_H = 1720;

export type VendorAccessCardImageInput = {
  /** Gate-scannable token (cvt1.…), encoded in the QR. */
  token: string;
  title: string;
  vendorName: string;
  eventTitle?: string | null;
  passMode: string;
  passType: string;
  teamCapacity: number;
  admittedCount?: number;
  admissionCode: string;
  accessZones: string[];
  validUntil?: string | null;
  contactName?: string | null;
  status?: string | null;
  /** Event/admin center logo URL or /brand path. */
  centerImageUrl?: string | null;
  logoSize?: "subtle" | "balanced" | "bold";
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(value: string, max: number): string {
  const t = value.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

async function loadBrandMark(): Promise<Buffer> {
  for (const rel of [CELEVENTIC_LOGO_MARK, CELEVENTIC_OFFICIAL_LOGO]) {
    try {
      return await readFile(path.join(process.cwd(), "public", rel.replace(/^\//, "")));
    } catch {
      /* try next */
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
    <rect width="128" height="128" rx="28" fill="${CELEVENTIC_PALETTE.teal}"/>
    <text x="64" y="88" font-family="Georgia,serif" font-size="72" font-weight="700" fill="#fff" text-anchor="middle">C</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Render a downloadable access-card PNG (branded QR with Celeventic center logo).
 */
export async function generateVendorAccessCardPng(
  input: VendorAccessCardImageInput
): Promise<Buffer> {
  const [qrPng, brandMark] = await Promise.all([
    generateBrandedQrPng(
      input.token,
      input.centerImageUrl ?? CELEVENTIC_OFFICIAL_LOGO,
      1024,
      "brand",
      input.logoSize ?? "balanced"
    ),
    loadBrandMark(),
  ]);

  const qrB64 = qrPng.toString("base64");
  const markB64 = brandMark.toString("base64");

  const zones = (input.accessZones.length ? input.accessZones : ["General Event Area"])
    .map((z) => z.trim())
    .filter(Boolean)
    .join(" · ");
  const accessLine = truncate(zones, 64);
  const vendorBracket = `(${truncate(input.vendorName, 42)})`;
  const code = formatAdmissionCode(input.admissionCode);
  const passKind =
    input.passMode === "INDIVIDUAL"
      ? "Individual Pass"
      : `Team Pass · ${input.teamCapacity} people`;
  const typeLabel = input.passType.replace(/_/g, " ");
  const eventLine = input.eventTitle ? truncate(input.eventTitle, 48) : "";
  const title = truncate(input.title, 48);
  const validLine = input.validUntil
    ? `Valid until ${new Date(input.validUntil).toLocaleString()}`
    : "";
  const contactLine = input.contactName ? `Contact · ${truncate(input.contactName, 40)}` : "";
  const statusLine = input.status && input.status !== "ACTIVE" ? String(input.status) : "";

  const { teal, gold, ivory, navy } = CELEVENTIC_PALETTE;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
  <defs>
    <linearGradient id="hdr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${teal}"/>
      <stop offset="100%" stop-color="#064842"/>
    </linearGradient>
  </defs>
  <rect width="${CARD_W}" height="${CARD_H}" rx="48" fill="${ivory}"/>
  <rect width="${CARD_W}" height="420" rx="48" fill="url(#hdr)"/>
  <rect y="360" width="${CARD_W}" height="60" fill="url(#hdr)"/>

  <image href="data:image/png;base64,${markB64}" x="72" y="56" width="72" height="72" preserveAspectRatio="xMidYMid meet"/>
  <text x="164" y="88" fill="#ffffff" font-family="Poppins,Helvetica,Arial,sans-serif" font-size="22" font-weight="600" letter-spacing="3">CELEVENTIC</text>
  <text x="164" y="118" fill="rgba(255,255,255,0.75)" font-family="Poppins,Helvetica,Arial,sans-serif" font-size="14" letter-spacing="2">VENDOR &amp; TEAM ACCESS</text>

  <text x="72" y="190" fill="${gold}" font-family="Poppins,Helvetica,Arial,sans-serif" font-size="18" font-weight="600" letter-spacing="3">${escapeXml(passKind.toUpperCase())}</text>
  ${eventLine ? `<text x="72" y="230" fill="rgba(255,255,255,0.85)" font-family="Poppins,Helvetica,Arial,sans-serif" font-size="26">${escapeXml(eventLine)}</text>` : ""}
  <text x="72" y="${eventLine ? 290 : 270}" fill="#ffffff" font-family="Poppins,Helvetica,Arial,sans-serif" font-size="44" font-weight="700">${escapeXml(title)}</text>
  <text x="72" y="${eventLine ? 340 : 320}" fill="rgba(255,255,255,0.9)" font-family="Poppins,Helvetica,Arial,sans-serif" font-size="28" font-weight="500">${escapeXml(truncate(input.vendorName, 48))}</text>
  <text x="72" y="390" fill="rgba(255,255,255,0.7)" font-family="Poppins,Helvetica,Arial,sans-serif" font-size="18" letter-spacing="1">${escapeXml(typeLabel)}</text>

  <rect x="120" y="460" width="840" height="840" rx="36" fill="#ffffff" stroke="#e2e8f0" stroke-width="3"/>
  <image href="data:image/png;base64,${qrB64}" x="160" y="500" width="760" height="760" preserveAspectRatio="xMidYMid meet"/>

  <text x="540" y="1360" text-anchor="middle" fill="${teal}" font-family="Poppins,Helvetica,Arial,sans-serif" font-size="20" font-weight="700" letter-spacing="4">ACCESS</text>
  <text x="540" y="1405" text-anchor="middle" fill="${navy}" font-family="Poppins,Helvetica,Arial,sans-serif" font-size="28" font-weight="600">${escapeXml(accessLine)}</text>
  <text x="540" y="1450" text-anchor="middle" fill="${teal}" font-family="Poppins,Helvetica,Arial,sans-serif" font-size="26" font-weight="600">${escapeXml(vendorBracket)}</text>

  <rect x="180" y="1485" width="720" height="100" rx="24" fill="#ffffff" stroke="${teal}" stroke-width="2" stroke-opacity="0.35"/>
  <text x="540" y="1520" text-anchor="middle" fill="${teal}" font-family="Poppins,Helvetica,Arial,sans-serif" font-size="16" font-weight="600" letter-spacing="3">ADMISSION CODE</text>
  <text x="540" y="1565" text-anchor="middle" fill="${navy}" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="40" font-weight="700" letter-spacing="8">${escapeXml(code)}</text>

  ${validLine ? `<text x="540" y="1625" text-anchor="middle" fill="#64748b" font-family="Poppins,Helvetica,Arial,sans-serif" font-size="18">${escapeXml(validLine)}</text>` : ""}
  ${contactLine ? `<text x="540" y="${validLine ? 1658 : 1625}" text-anchor="middle" fill="#64748b" font-family="Poppins,Helvetica,Arial,sans-serif" font-size="18">${escapeXml(contactLine)}</text>` : ""}
  ${statusLine ? `<text x="980" y="80" text-anchor="end" fill="${gold}" font-family="Poppins,Helvetica,Arial,sans-serif" font-size="18" font-weight="700" letter-spacing="2">${escapeXml(statusLine)}</text>` : ""}

  <text x="540" y="1698" text-anchor="middle" fill="#94a3b8" font-family="Poppins,Helvetica,Arial,sans-serif" font-size="14" letter-spacing="1">celeventic.com · Celebrate · Event · Ticket</text>
</svg>`;

  return sharp(Buffer.from(svg)).png({ quality: 95, compressionLevel: 8 }).toBuffer();
}
