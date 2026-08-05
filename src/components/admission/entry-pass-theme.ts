/**
 * Entry Pass theming.
 *
 * The pass sits at the bottom of every invitation template, so it has to feel
 * native to a luxury wedding, a traditional ceremony, and a corporate gala
 * alike, without ever compromising QR contrast. The QR panel stays pure
 * white-on-black in every preset; only the surrounding frame changes.
 */

export type EntryPassPreset = "luxury" | "traditional" | "corporate" | "minimal";

export interface EntryPassTheme {
  /** Outer card surface. */
  surface: string;
  /** Hairline border on the card. */
  border: string;
  /** Section eyebrow ("YOUR ENTRY PASS"). */
  eyebrow: string;
  /** Primary heading / guest name. */
  heading: string;
  /** Secondary copy. */
  body: string;
  /** Admission-code plate. */
  codePlate: string;
  codeText: string;
  /** Divider rule. */
  divider: string;
  /** Action buttons. */
  action: string;
  accent: string;
  /** Always-on highlight plate for gate / entrance instructions. */
  instructionsPlate: string;
  instructionsText: string;
  instructionsEyebrow: string;
}

const THEMES: Record<EntryPassPreset, EntryPassTheme> = {
  luxury: {
    surface: "bg-[#FBF8F1]",
    border: "border-[#D4A63A]/35",
    eyebrow: "text-[#9A7B22]",
    heading: "text-[#1A1408]",
    body: "text-[#6B5B39]",
    codePlate: "bg-white border-[#D4A63A]/40",
    codeText: "text-[#1A1408]",
    divider: "bg-[#D4A63A]/25",
    action: "border-[#D4A63A]/40 text-[#7A6118] hover:bg-[#D4A63A]/10",
    accent: "#D4A63A",
    instructionsPlate:
      "mx-4 mb-1 rounded-2xl border border-[#D4A63A]/55 bg-gradient-to-br from-[#F5E6B8]/90 via-[#FBF3D8] to-[#F0D78A]/70 shadow-[0_8px_24px_-16px_rgba(154,123,34,0.55)]",
    instructionsText: "text-[#1A1408] font-semibold",
    instructionsEyebrow: "text-[#9A7B22]",
  },
  traditional: {
    surface: "bg-[#FDF6EC]",
    border: "border-[#9C3B12]/25",
    eyebrow: "text-[#9C3B12]",
    heading: "text-[#2B1508]",
    body: "text-[#6E4A31]",
    codePlate: "bg-white border-[#9C3B12]/30",
    codeText: "text-[#2B1508]",
    divider: "bg-[#9C3B12]/20",
    action: "border-[#9C3B12]/30 text-[#8A3410] hover:bg-[#9C3B12]/10",
    accent: "#9C3B12",
    instructionsPlate:
      "mx-4 mb-1 rounded-2xl border border-[#9C3B12]/45 bg-gradient-to-br from-[#F8E4D4] via-[#FDF0E4] to-[#F2D2B8] shadow-[0_8px_24px_-16px_rgba(156,59,18,0.4)]",
    instructionsText: "text-[#2B1508] font-semibold",
    instructionsEyebrow: "text-[#9C3B12]",
  },
  corporate: {
    surface: "bg-slate-50",
    border: "border-slate-300",
    eyebrow: "text-slate-500",
    heading: "text-slate-900",
    body: "text-slate-600",
    codePlate: "bg-white border-slate-300",
    codeText: "text-slate-900",
    divider: "bg-slate-200",
    action: "border-slate-300 text-slate-700 hover:bg-slate-100",
    accent: "#334155",
    instructionsPlate:
      "mx-4 mb-1 rounded-2xl border border-slate-400/60 bg-gradient-to-br from-amber-50 via-white to-slate-100 shadow-sm",
    instructionsText: "text-slate-900 font-semibold",
    instructionsEyebrow: "text-slate-600",
  },
  minimal: {
    surface: "bg-white",
    border: "border-black/10",
    eyebrow: "text-slate-500",
    heading: "text-slate-900",
    body: "text-slate-600",
    codePlate: "bg-slate-50 border-black/10",
    codeText: "text-slate-900",
    divider: "bg-black/10",
    action: "border-black/15 text-slate-700 hover:bg-slate-50",
    accent: "#0F172A",
    instructionsPlate:
      "mx-4 mb-1 rounded-2xl border border-amber-400/50 bg-gradient-to-br from-amber-50 via-white to-amber-100/80 shadow-sm",
    instructionsText: "text-slate-900 font-semibold",
    instructionsEyebrow: "text-amber-800",
  },
};

const LUXURY_LAYOUTS = new Set([
  "forever-afaris-wedding",
  "luxury-rings",
  "classic-gold",
  "passport-luxe",
  "glass-acrylic",
]);

const TRADITIONAL_LAYOUTS = new Set(["traditional-marriage-ceremony", "rustic-lace", "boho-hexagon"]);

/** Pick the preset that matches the invitation's template family. */
export function resolveEntryPassPreset(layout?: string | null): EntryPassPreset {
  if (!layout) return "minimal";
  if (LUXURY_LAYOUTS.has(layout)) return "luxury";
  if (TRADITIONAL_LAYOUTS.has(layout)) return "traditional";
  if (layout.startsWith("corporate") || layout.includes("gala")) return "corporate";
  return "minimal";
}

export function entryPassTheme(preset: EntryPassPreset): EntryPassTheme {
  return THEMES[preset];
}
