import type { DigitalCardTheme } from "@/lib/digital-business-card/themes";

const playfair = "var(--font-playfair), Georgia, 'Times New Roman', serif";
const cinzel = "var(--font-cinzel), Palatino, 'Palatino Linotype', serif";
const editorial = "var(--font-cormorant), Georgia, serif";
const sans = "var(--font-sans), system-ui, sans-serif";

export type CeleCardOriginStyle = "letterhead" | "credit" | "stamp" | "neon" | "masthead" | "carved" | "script" | "mono";
export type CeleCardRuleStyle = "foil" | "none" | "double" | "bar";

export type CeleCardTypeVoice = {
  heading: string;
  title: string;
  meta: string;
  origin: string;
  nameTracking: string;
  nameWeight: number;
  titleItalic: boolean;
  titleTracking: string;
  companyTracking: string;
  companyTransform: "uppercase" | "none";
  rule: CeleCardRuleStyle;
  originStyle: CeleCardOriginStyle;
  stacksDisplayName: boolean;
};

function letterhead(): CeleCardTypeVoice {
  return {
    heading: playfair,
    title: editorial,
    meta: editorial,
    origin: cinzel,
    nameTracking: "-0.03em",
    nameWeight: 600,
    titleItalic: true,
    titleTracking: "0.01em",
    companyTracking: "0.16em",
    companyTransform: "uppercase",
    rule: "foil",
    originStyle: "letterhead",
    stacksDisplayName: true,
  };
}

function carved(): CeleCardTypeVoice {
  return {
    heading: cinzel,
    title: editorial,
    meta: editorial,
    origin: cinzel,
    nameTracking: "0.04em",
    nameWeight: 600,
    titleItalic: true,
    titleTracking: "0.02em",
    companyTracking: "0.18em",
    companyTransform: "uppercase",
    rule: "double",
    originStyle: "carved",
    stacksDisplayName: true,
  };
}

function credit(): CeleCardTypeVoice {
  return {
    heading: cinzel,
    title: sans,
    meta: sans,
    origin: cinzel,
    nameTracking: "0.06em",
    nameWeight: 600,
    titleItalic: false,
    titleTracking: "0.12em",
    companyTracking: "0.22em",
    companyTransform: "uppercase",
    rule: "bar",
    originStyle: "credit",
    stacksDisplayName: false,
  };
}

function stamp(): CeleCardTypeVoice {
  return {
    heading: sans,
    title: sans,
    meta: sans,
    origin: sans,
    nameTracking: "-0.02em",
    nameWeight: 600,
    titleItalic: false,
    titleTracking: "0",
    companyTracking: "0.12em",
    companyTransform: "uppercase",
    rule: "none",
    originStyle: "stamp",
    stacksDisplayName: false,
  };
}

function masthead(): CeleCardTypeVoice {
  return {
    heading: sans,
    title: sans,
    meta: sans,
    origin: sans,
    nameTracking: "-0.04em",
    nameWeight: 700,
    titleItalic: false,
    titleTracking: "0.04em",
    companyTracking: "0.14em",
    companyTransform: "uppercase",
    rule: "bar",
    originStyle: "masthead",
    stacksDisplayName: false,
  };
}

function neon(): CeleCardTypeVoice {
  return {
    heading: sans,
    title: sans,
    meta: sans,
    origin: sans,
    nameTracking: "0.08em",
    nameWeight: 700,
    titleItalic: false,
    titleTracking: "0.16em",
    companyTracking: "0.2em",
    companyTransform: "uppercase",
    rule: "none",
    originStyle: "neon",
    stacksDisplayName: false,
  };
}

function script(): CeleCardTypeVoice {
  return {
    heading: editorial,
    title: editorial,
    meta: editorial,
    origin: cinzel,
    nameTracking: "0.01em",
    nameWeight: 500,
    titleItalic: true,
    titleTracking: "0.02em",
    companyTracking: "0.12em",
    companyTransform: "none",
    rule: "foil",
    originStyle: "script",
    stacksDisplayName: false,
  };
}

function mono(): CeleCardTypeVoice {
  return {
    heading: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    title: sans,
    meta: sans,
    origin: sans,
    nameTracking: "0.04em",
    nameWeight: 600,
    titleItalic: false,
    titleTracking: "0.08em",
    companyTracking: "0.14em",
    companyTransform: "uppercase",
    rule: "none",
    originStyle: "mono",
    stacksDisplayName: false,
  };
}

const CELECARD_NAME_PARTICLES = new Set([
  "van",
  "von",
  "der",
  "den",
  "de",
  "da",
  "del",
  "della",
  "di",
  "du",
  "la",
  "le",
  "bin",
  "bint",
  "al",
  "el",
  "ten",
  "ter",
  "st",
  "saint",
]);

const CELECARD_NAME_SUFFIXES = new Set([
  "jr",
  "sr",
  "jnr",
  "snr",
  "junior",
  "senior",
  "ii",
  "iii",
  "iv",
  "v",
  "vi",
]);

export type CeleCardSplitDisplayName = {
  given: string;
  middles: string[];
  family: string;
  suffix: string;
};

function celecardNormalizeDisplayName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

function celecardNameTokenKey(token: string): string {
  return token.replace(/[.]/g, "").toLowerCase();
}

function celecardIsNameParticle(token: string): boolean {
  return CELECARD_NAME_PARTICLES.has(celecardNameTokenKey(token));
}

function celecardIsNameSuffix(token: string): boolean {
  return CELECARD_NAME_SUFFIXES.has(celecardNameTokenKey(token));
}

function celecardFirstLetter(token: string): string | null {
  const match = token.match(/\p{L}/u);
  return match ? match[0] : null;
}

/** Middle tokens become initials. Particles stay written as the cardholder typed them. */
export function celecardAbbreviateMiddleToken(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) return "";
  if (celecardIsNameParticle(trimmed)) return trimmed;
  if (trimmed.includes("-")) {
    return trimmed
      .split("-")
      .filter(Boolean)
      .map((part) => celecardAbbreviateMiddleToken(part))
      .join("-");
  }
  const letter = celecardFirstLetter(trimmed);
  if (!letter) return trimmed;
  return `${letter.toLocaleUpperCase()}.`;
}

export function celecardSplitDisplayName(name: string): CeleCardSplitDisplayName {
  const tokens = celecardNormalizeDisplayName(name).split(" ").filter(Boolean);
  if (!tokens.length) return { given: "", middles: [], family: "", suffix: "" };
  if (tokens.length === 1) return { given: tokens[0], middles: [], family: "", suffix: "" };

  const suffixes: string[] = [];
  let end = tokens.length;
  while (end > 1 && celecardIsNameSuffix(tokens[end - 1])) {
    suffixes.unshift(tokens[--end]);
  }

  let familyStart = Math.max(1, end - 1);
  while (familyStart > 1 && celecardIsNameParticle(tokens[familyStart - 1])) {
    familyStart -= 1;
  }

  const given = tokens[0] ?? "";
  const middles = tokens.slice(1, familyStart);
  return {
    given,
    middles,
    family: tokens.slice(familyStart, end).join(" "),
    suffix: suffixes.join(" "),
  };
}

/**
 * Plate presentation only. Saved identity, vCard, and share titles keep the full name.
 * Three or more name parts abbreviate middles: Jeffery Owuraku Afari → Jeffery O. Afari.
 */
export function celecardPlateDisplayName(name: string): string {
  const trimmed = celecardNormalizeDisplayName(name);
  if (!trimmed) return "";
  const parts = celecardSplitDisplayName(trimmed);
  if (!parts.middles.length) return trimmed;
  const middles = parts.middles.map(celecardAbbreviateMiddleToken);
  return [parts.given, ...middles, parts.family, parts.suffix].filter(Boolean).join(" ");
}

function celecardJoinNameParts(...parts: Array<string | string[]>): string {
  return parts
    .flat()
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
}

/** Letterhead cards keep given names and family name on separate lines when a single line would read too small. */
export function celecardDisplayNameLines(name: string, stack: boolean): string[] {
  const plate = celecardPlateDisplayName(name);
  if (!plate) return [""];
  if (!stack) return [plate];
  const parts = celecardSplitDisplayName(name);
  const givenLine = celecardJoinNameParts(parts.given, parts.middles.map(celecardAbbreviateMiddleToken));
  const familyLine = celecardJoinNameParts(parts.family, parts.suffix);
  if (!familyLine || !givenLine) return [plate];
  return [givenLine, familyLine];
}

/** Container-query font size so a long name sits in the identity column without overflowing. */
export function celecardNameFitCqw(name: string, stacked: boolean, compact = false): number {
  const lines = celecardDisplayNameLines(name, stacked);
  const longest = Math.max(
    1,
    ...lines.map((line) => {
      const letters = line.replace(/\s+/g, "").length;
      const gaps = Math.max(0, line.trim().split(/\s+/).filter(Boolean).length - 1);
      return letters + gaps * 0.32;
    })
  );
  const column = compact ? 33 : stacked ? 28.5 : 36;
  const fitted = column / (longest * 0.62);
  const cap = lines.length > 1 ? (compact ? 5.35 : 5.55) : compact ? 6.8 : 7;
  return Math.round(Math.max(3.35, Math.min(cap, fitted)) * 100) / 100;
}

/** Stack given name and family name only when a single abbreviated line would read too small. */
export function celecardNameShouldStack(name: string, stackedVoice: boolean, compact = false): boolean {
  if (!stackedVoice) return false;
  if (celecardDisplayNameLines(name, true).length < 2) return false;
  return celecardNameFitCqw(name, false, compact) < 3.5;
}

const CELECARD_PHRASE_SMALL_WORDS = new Set([
  "and",
  "of",
  "the",
  "for",
  "&",
  "at",
  "in",
  "on",
  "to",
  "de",
  "du",
  "la",
  "le",
]);

type CeleCardPhraseKind = "company" | "title";

type CeleCardPhraseOptions = {
  uppercase?: boolean;
  compact?: boolean;
};

function celecardPhraseVisualLen(text: string, uppercase: boolean): number {
  const letters = text.replace(/\s+/g, "").length;
  const gaps = Math.max(0, text.trim().split(/\s+/).filter(Boolean).length - 1);
  return letters + gaps * (uppercase ? 0.55 : 0.32);
}

function celecardBestPhraseBreak(words: string[], uppercase: boolean): number {
  let best = Math.max(1, Math.ceil(words.length / 2));
  let bestScore = Number.POSITIVE_INFINITY;
  for (let i = 1; i < words.length; i += 1) {
    const left = words.slice(0, i).join(" ");
    const right = words.slice(i).join(" ");
    const imbalance = Math.abs(celecardPhraseVisualLen(left, uppercase) - celecardPhraseVisualLen(right, uppercase));
    const hinge = CELECARD_PHRASE_SMALL_WORDS.has(words[i - 1].toLowerCase()) ? -1.4 : 0;
    const orphan = right.split(" ").length === 1 && right.length <= 3 ? 5 : 0;
    const score = imbalance + hinge + orphan;
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

function celecardPhraseLimit(kind: CeleCardPhraseKind, uppercase: boolean, compact: boolean): number {
  if (kind === "title") return compact ? (uppercase ? 16 : 20) : uppercase ? 20 : 24;
  return compact ? (uppercase ? 15 : 18) : uppercase ? 18 : 22;
}

function celecardPhraseDisplayLines(
  name: string,
  kind: CeleCardPhraseKind,
  options?: CeleCardPhraseOptions
): string[] {
  const trimmed = name.replace(/\s+/g, " ").trim();
  if (!trimmed) return [];
  const uppercase = Boolean(options?.uppercase);
  const compact = Boolean(options?.compact);
  const words = trimmed.split(" ");
  const limit = celecardPhraseLimit(kind, uppercase, compact);
  if (words.length === 1 || celecardPhraseVisualLen(trimmed, uppercase) <= limit) {
    return [trimmed];
  }
  const first = celecardBestPhraseBreak(words, uppercase);
  const left = words.slice(0, first);
  const right = words.slice(first);
  const allowThree =
    !compact && words.length >= 6 && celecardPhraseVisualLen(trimmed, uppercase) > limit * 2;
  if (!allowThree || right.length < 3) {
    return [left.join(" "), right.join(" ")].filter(Boolean);
  }
  const second = celecardBestPhraseBreak(right, uppercase);
  return [left.join(" "), right.slice(0, second).join(" "), right.slice(second).join(" ")].filter(Boolean);
}

/**
 * Plate presentation only. The saved company field stays in full.
 * The house mark now sits on the portrait, so three-word names use the freed
 * column: line one next to the photo, line two beneath.
 */
export function celecardCompanyDisplayLines(
  name: string,
  options?: CeleCardPhraseOptions
): string[] {
  const trimmed = name.replace(/\s+/g, " ").trim();
  if (!trimmed) return [];
  const uppercase = Boolean(options?.uppercase);
  const words = trimmed.split(" ");
  if (words.length >= 3 && words.length < 6) {
    const first = celecardBestPhraseBreak(words, uppercase);
    return [words.slice(0, first).join(" "), words.slice(first).join(" ")].filter(Boolean);
  }
  return celecardPhraseDisplayLines(name, "company", options);
}

export function celecardCompanyFitCqw(name: string, options?: CeleCardPhraseOptions): number {
  const lines = celecardCompanyDisplayLines(name, options);
  if (!lines.length) return 2.65;
  const uppercase = Boolean(options?.uppercase);
  const compact = Boolean(options?.compact);
  const longest = Math.max(1, ...lines.map((line) => celecardPhraseVisualLen(line, uppercase)));
  const column = compact ? 36 : 44;
  const fitted = column / (longest * (uppercase ? 0.72 : 0.62));
  const cap = lines.length > 1 ? (compact ? 2.32 : 2.48) : compact ? 2.45 : 2.65;
  const floor = compact ? 1.85 : 1.95;
  return Math.round(Math.max(floor, Math.min(cap, fitted)) * 100) / 100;
}

/**
 * Plate presentation only. The saved title field stays in full.
 * The house mark left this row, so the role stays on one line and fills that width.
 */
export function celecardTitleDisplayLines(name: string, options?: CeleCardPhraseOptions): string[] {
  void options;
  const trimmed = name.replace(/\s+/g, " ").trim();
  return trimmed ? [trimmed] : [];
}

export function celecardTitleFitCqw(name: string, options?: CeleCardPhraseOptions): number {
  const lines = celecardTitleDisplayLines(name, options);
  if (!lines.length) return 2.9;
  const uppercase = Boolean(options?.uppercase);
  const compact = Boolean(options?.compact);
  const longest = Math.max(1, ...lines.map((line) => celecardPhraseVisualLen(line, uppercase)));
  const column = compact ? 36 : 42;
  const fitted = column / (longest * (uppercase ? 0.72 : 0.64));
  const cap = compact ? 2.7 : 2.9;
  const floor = compact ? 2.05 : 2.15;
  return Math.round(Math.max(floor, Math.min(cap, fitted)) * 100) / 100;
}

export function celecardTypeVoice(
  theme: DigitalCardTheme,
  lettering?: CeleCardOriginStyle | null
): CeleCardTypeVoice {
  if (lettering === "letterhead") return letterhead();
  if (lettering === "credit") return credit();
  if (lettering === "stamp") return stamp();
  if (lettering === "neon") return neon();
  if (lettering === "masthead") return masthead();
  if (lettering === "carved") return carved();
  if (lettering === "script") return script();
  if (lettering === "mono") return mono();
  const { category, ornament, atmosphere } = theme;

  if (ornament === "neon" || atmosphere === "cel-speed" || theme.id === "cyber-neon") {
    return neon();
  }
  if (ornament === "marquee" || category === "cinematic" || atmosphere === "film-credits" || atmosphere === "spotlight") {
    return credit();
  }
  if (category === "landmark" || ornament === "kente" || atmosphere === "dunes" || atmosphere === "canopy") {
    return carved();
  }
  if (category === "creator" || category === "personal" || category === "public-figure") {
    return masthead();
  }
  if (category === "executive" || category === "business" || category === "minimal") {
    return stamp();
  }
  if (category === "luxury" || category === "atelier") {
    return letterhead();
  }
  if (category === "iconic") {
    if (ornament === "halftone" || atmosphere === "pop-burst" || atmosphere === "comic-panel" || atmosphere === "street-asphalt") {
      return masthead();
    }
    if (ornament === "cel") return neon();
    return credit();
  }
  return letterhead();
}

function hexLum(hex: string) {
  const value = hex.replace("#", "");
  if (value.length < 6) return 0;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function parseHexRgb(color: string): [number, number, number] | null {
  const value = color.trim().replace("#", "");
  if (value.length === 3) {
    return [
      parseInt(value[0] + value[0], 16),
      parseInt(value[1] + value[1], 16),
      parseInt(value[2] + value[2], 16),
    ];
  }
  if (value.length < 6) return null;
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

function toHexRgb(r: number, g: number, b: number) {
  return `#${[r, g, b].map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0")).join("")}`;
}

export function celecardInkLuminance(color: string) {
  const rgb = parseHexRgb(color);
  if (!rgb) return 0;
  return hexLum(toHexRgb(...rgb));
}

function channelLum(hex: string) {
  const rgb = parseHexRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors. */
export function celecardContrastRatio(a: string, b: string) {
  const light = Math.max(channelLum(a), channelLum(b));
  const dark = Math.min(channelLum(a), channelLum(b));
  return (light + 0.05) / (dark + 0.05);
}

function inkOn(hex: string) {
  return hexLum(hex) < 158 ? "#fff8ef" : "#16120e";
}

/** Type color that stays readable on this fill. Light fill gets dark ink. Dark fill gets cream. */
export function celecardInkOn(fill: string) {
  return inkOn(fill);
}

function ctaPair(fill: string) {
  return { background: fill, color: inkOn(fill) };
}

/** Wallet and guest CTAs on a plate. Never cream type on a pale fill, never a fill that vanishes into the paper. */
export function celecardCtaOnPaper(accent: string, paper: string) {
  const cream = "#fffef8";
  const ink = "#16120e";
  const accentLum = celecardInkLuminance(accent);
  const paperLum = celecardInkLuminance(paper);
  const fill = Math.abs(accentLum - paperLum) < 48 ? cream : accent;
  const pair = ctaPair(fill);
  if (celecardContrastRatio(pair.color, pair.background) >= 4.5) return pair;
  return ctaPair(celecardInkLuminance(paper) < 140 ? cream : ink);
}

/** Reach pills are always light paper. Type is always dark, on every template. */
export const CELECARD_REACH_INK = "#1c1917";
export const CELECARD_REACH_MUTED = "#44403c";

/** Actions on cream payment cards. Dark ink on light paper, never accent-on-accent. */
export function celecardActionOnWell() {
  return { background: "#fffef8", color: CELECARD_REACH_INK, borderColor: "rgba(28,25,23,0.16)" };
}
/** Studio, dashboard, and forms. Never plate cream or mint on light paper. */
export const CELECARD_PAPER_INK = CELECARD_REACH_INK;
export const CELECARD_PAPER_MUTED = "#3f3a36";
export const CELECARD_PAPER_LABEL = "#0B8A83";
const PAPER_ACCENT_LUM_MAX = 142;

/** Keep the house hue, pull it down until it reads on white. */
export function celecardPaperAccent(accent: string): string {
  const rgb = parseHexRgb(accent);
  if (!rgb) return CELECARD_PAPER_LABEL;
  let [r, g, b] = rgb;
  let lum = (r * 299 + g * 587 + b * 114) / 1000;
  if (lum <= PAPER_ACCENT_LUM_MAX) return toHexRgb(r, g, b);
  while (lum > PAPER_ACCENT_LUM_MAX && (r > 10 || g > 10 || b > 10)) {
    r = Math.max(0, Math.round(r * 0.9));
    g = Math.max(0, Math.round(g * 0.9));
    b = Math.max(0, Math.round(b * 0.9));
    lum = (r * 299 + g * 587 + b * 114) / 1000;
  }
  return toHexRgb(r, g, b);
}

export function celecardPaperTone(theme: Pick<DigitalCardTheme, "accent">) {
  return {
    text: CELECARD_PAPER_INK,
    muted: CELECARD_PAPER_MUTED,
    accent: celecardPaperAccent(theme.accent),
    label: celecardPaperAccent(theme.accent),
  };
}

export function celecardReachPlate(_theme: DigitalCardTheme, darkStage: boolean) {
  return {
    borderColor: darkStage ? "rgba(255,255,255,0.16)" : "rgba(28,25,23,0.12)",
    background: darkStage ? "rgba(255,251,245,0.97)" : "rgba(255,255,255,0.97)",
    color: CELECARD_REACH_INK,
  };
}

/** Section labels stay on-accent unless the accent would vanish on the stage. */
export function celecardAccentOnStage(accent: string, darkStage: boolean) {
  const lum = hexLum(accent.startsWith("#") ? accent.slice(0, 7) : accent);
  if (darkStage && lum < 88) return "#f4e6c8";
  if (!darkStage && lum > PAPER_ACCENT_LUM_MAX) return celecardPaperAccent(accent);
  return accent;
}

/** Guest section lockups. House hue, never a washed gray. */
export function celecardKickerInk(accent: string, darkStage: boolean) {
  const ink = celecardAccentOnStage(accent, darkStage);
  const rgb = parseHexRgb(ink);
  if (!rgb) return ink;
  const [r, g, b] = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min >= 18) return ink;
  return darkStage ? "#f4e6c8" : CELECARD_PAPER_LABEL;
}

export type CeleCardDockFinish = {
  originStyle: CeleCardOriginStyle;
  veil: string;
  trayBg: string;
  trayBorder: string;
  trayShadow: string;
  trayRadius: string;
  actionRadius: string;
  saveBg: string;
  saveFg: string;
  ghostBg: string;
  ghostFg: string;
  ghostBorder: string;
  font: string;
  tracking: string;
  labelTransform: "uppercase" | "none";
  foil: boolean;
};

export function celecardDockFinish(
  theme: DigitalCardTheme,
  stage: { darkStage: boolean; stageHex?: string },
  lettering?: CeleCardOriginStyle | null
): CeleCardDockFinish {
  const voice = celecardTypeVoice(theme, lettering);
  const { originStyle } = voice;
  const dark = stage.darkStage;
  const stageHex = stage.stageHex ?? (dark ? "1a1410" : "f5efe4");
  const veil = dark
    ? `linear-gradient(180deg, transparent 0%, #${stageHex}00 18%, #${stageHex}c7 100%)`
    : `linear-gradient(180deg, transparent 0%, #${stageHex}00 12%, #${stageHex}e8 100%)`;
  const trayBg = dark
    ? originStyle === "neon"
      ? `linear-gradient(180deg, ${theme.accent}2e 0%, rgba(2,6,23,0.88) 100%)`
      : `linear-gradient(185deg, rgba(255,255,255,0.12) 0%, rgba(16,14,12,0.62) 34%, rgba(8,8,8,0.88) 100%)`
    : `linear-gradient(180deg, rgba(255,252,247,0.96) 0%, ${theme.accent}1a 100%)`;
  const trayShadow = originStyle === "neon"
    ? `0 0 28px ${theme.accent}55, 0 18px 40px rgba(0,0,0,0.45), inset 0 1px 0 ${theme.accent}88`
    : dark
      ? `0 16px 48px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.2)`
      : `0 18px 44px rgba(8,12,20,0.16), inset 0 1px 0 rgba(255,255,255,0.92)`;
  const trayRadius =
    originStyle === "credit"
      ? "999px"
      : originStyle === "stamp" || originStyle === "mono"
        ? "0.65rem"
        : originStyle === "neon"
          ? "0.9rem"
          : "1.5rem";
  const actionRadius =
    originStyle === "credit"
      ? "999px"
      : originStyle === "stamp" || originStyle === "mono"
        ? "0.48rem"
        : originStyle === "neon"
          ? "0.7rem"
          : "1.1rem";
  const tracking =
    originStyle === "credit" || originStyle === "neon"
      ? "0.14em"
      : originStyle === "stamp" || originStyle === "mono"
        ? "0.04em"
        : "0.12em";

  return {
    originStyle,
    veil,
    trayBg,
    trayBorder: dark ? `${theme.border}99` : theme.border,
    trayShadow,
    trayRadius,
    actionRadius,
    saveBg: theme.accent,
    saveFg: inkOn(theme.accent),
    ghostBg: dark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.92)",
    ghostFg: dark ? "#f4e6c8" : CELECARD_REACH_INK,
    ghostBorder: dark ? "rgba(255,255,255,0.2)" : "rgba(28,25,23,0.14)",
    font: voice.origin,
    tracking,
    labelTransform: originStyle === "stamp" || originStyle === "mono" ? "none" : "uppercase",
    foil: originStyle === "letterhead" || originStyle === "carved" || originStyle === "script",
  };
}
