/**
 * Printable Event Guide signage.
 *
 * A welcome board is read from two metres away by someone holding a drink, so
 * the geometry is deliberate: a very large quiet-zoned QR, the couple/host line
 * above it, one short scan instruction below it, and nothing else competing.
 *
 * Pure geometry + copy. The PDF/PNG renderers consume this; the admin previews
 * the same numbers, so what is previewed is what prints.
 */

export type SignSizeKey = "a4" | "a3" | "letter" | "tabletop";
export type SignTemplateKey = "wedding" | "classic" | "corporate" | "celebration" | "memorial";
export type SignQrLayout = "single" | "dual";

export interface SignSize {
  key: SignSizeKey;
  label: string;
  /** PDF points (72 per inch). */
  width: number;
  height: number;
  /** Millimetres, for the admin label. */
  mm: string;
}

export const SIGN_SIZES: Record<SignSizeKey, SignSize> = {
  a4: { key: "a4", label: "A4 portrait", width: 595.28, height: 841.89, mm: "210 × 297 mm" },
  a3: { key: "a3", label: "A3 portrait", width: 841.89, height: 1190.55, mm: "297 × 420 mm" },
  letter: { key: "letter", label: "US Letter", width: 612, height: 792, mm: "216 × 279 mm" },
  tabletop: { key: "tabletop", label: "Tabletop card (5×7 in)", width: 360, height: 504, mm: "127 × 178 mm" },
};

export interface SignTemplate {
  key: SignTemplateKey;
  label: string;
  eyebrow: string;
  scanInstruction: string;
  /** Sub-line under the instruction; omitted when the sign is already crowded. */
  supporting: string;
  /** Rule/flourish weight in points. */
  ruleWeight: number;
  uppercaseTitle: boolean;
}

export const SIGN_TEMPLATES: Record<SignTemplateKey, SignTemplate> = {
  wedding: {
    key: "wedding",
    label: "Wedding — elegant",
    eyebrow: "Welcome",
    scanInstruction: "Scan for the order of service, your table and the menu",
    supporting: "Point your camera at the code",
    ruleWeight: 0.75,
    uppercaseTitle: false,
  },
  classic: {
    key: "classic",
    label: "Classic — understated",
    eyebrow: "Event Guide",
    scanInstruction: "Scan for the programme, seating and menu",
    supporting: "Point your camera at the code",
    ruleWeight: 0.75,
    uppercaseTitle: false,
  },
  corporate: {
    key: "corporate",
    label: "Corporate — clean",
    eyebrow: "Delegate Information",
    scanInstruction: "Scan for the agenda, your table and catering",
    supporting: "No app needed — open with your camera",
    ruleWeight: 1.25,
    uppercaseTitle: true,
  },
  celebration: {
    key: "celebration",
    label: "Celebration — warm",
    eyebrow: "You're Welcome Here",
    scanInstruction: "Scan for tonight's running order, your seat and the menu",
    supporting: "Point your camera at the code",
    ruleWeight: 1,
    uppercaseTitle: false,
  },
  memorial: {
    key: "memorial",
    label: "Memorial — respectful",
    eyebrow: "In Loving Memory",
    scanInstruction: "Scan for the order of service and seating",
    supporting: "Point your camera at the code",
    ruleWeight: 0.5,
    uppercaseTitle: false,
  },
};

export const ONLINE_QR_LABEL = "Main";
export const OFFLINE_QR_LABEL = "Backup";

export function offlineQrWarning(wifiName: string | null | undefined): string {
  const network = wifiName?.trim();
  return network
    ? `Backup code — works only on the “${network}” Wi-Fi at this venue`
    : "Backup code — works only on the event Wi-Fi at this venue";
}

export interface SignLayout {
  size: SignSize;
  margin: number;
  /** QR module box, excluding the printed quiet zone. */
  qr: { x: number; y: number; size: number };
  secondaryQr: { x: number; y: number; size: number } | null;
  /** Printed white border around each QR, in points. */
  quietZone: number;
  titleY: number;
  eyebrowY: number;
  celebrantsY: number;
  detailY: number;
  instructionY: number;
  footerY: number;
  fontScale: number;
}

/**
 * Lay out a sign.
 *
 * The QR is sized as a fraction of the page width rather than a fixed value so
 * an A3 board and a tabletop card both scan from their intended distance. The
 * quiet zone is a printed white margin of at least four modules' worth — QR
 * codes without one fail on matte card stock under warm venue lighting.
 */
export function computeSignLayout(
  sizeKey: SignSizeKey,
  layout: SignQrLayout = "single"
): SignLayout {
  const size = SIGN_SIZES[sizeKey];
  const margin = size.width * 0.09;
  const fontScale = size.width / SIGN_SIZES.a4.width;
  const quietZone = Math.max(10, size.width * 0.022);

  const eyebrowY = size.height - margin - 14 * fontScale;
  const titleY = eyebrowY - 42 * fontScale;
  const celebrantsY = titleY - 30 * fontScale;
  const detailY = celebrantsY - 26 * fontScale;

  if (layout === "dual") {
    const gutter = size.width * 0.06;
    const qrSize = (size.width - margin * 2 - gutter) / 2 - quietZone * 2;
    const top = detailY - 46 * fontScale - qrSize - quietZone;
    return {
      size,
      margin,
      quietZone,
      qr: { x: margin + quietZone, y: top, size: qrSize },
      secondaryQr: { x: margin + quietZone * 3 + qrSize + gutter, y: top, size: qrSize },
      titleY,
      eyebrowY,
      celebrantsY,
      detailY,
      instructionY: top - 34 * fontScale,
      footerY: margin + 16 * fontScale,
      fontScale,
    };
  }

  const qrSize = Math.min(size.width - margin * 2 - quietZone * 2, size.height * 0.44);
  const top = detailY - 48 * fontScale - qrSize;
  return {
    size,
    margin,
    quietZone,
    qr: { x: (size.width - qrSize) / 2, y: top, size: qrSize },
    secondaryQr: null,
    titleY,
    eyebrowY,
    celebrantsY,
    detailY,
    instructionY: top - 40 * fontScale,
    footerY: margin + 16 * fontScale,
    fontScale,
  };
}

export interface SignContent {
  eventTitle: string;
  celebrants: string | null;
  dateLabel: string | null;
  venue: string | null;
  template: SignTemplateKey;
  layout: SignQrLayout;
  wifiName: string | null;
}

/** The exact strings that will be printed, so the preview cannot drift. */
export function resolveSignCopy(content: SignContent): {
  eyebrow: string;
  title: string;
  celebrants: string | null;
  detail: string | null;
  instruction: string;
  supporting: string;
  primaryLabel: string | null;
  secondaryLabel: string | null;
  footer: string | null;
} {
  const template = SIGN_TEMPLATES[content.template];
  const detail = [content.dateLabel, content.venue].filter(Boolean).join("  ·  ") || null;
  const dual = content.layout === "dual";

  return {
    eyebrow: template.eyebrow,
    title: template.uppercaseTitle ? content.eventTitle.toUpperCase() : content.eventTitle,
    celebrants: content.celebrants?.trim() || null,
    detail,
    instruction: template.scanInstruction,
    supporting: template.supporting,
    primaryLabel: dual ? ONLINE_QR_LABEL : null,
    secondaryLabel: dual ? OFFLINE_QR_LABEL : null,
    footer: dual ? offlineQrWarning(content.wifiName) : null,
  };
}
