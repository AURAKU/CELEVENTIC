import type { DigitalCardTheme } from "@/lib/digital-business-card/themes";

const playfair = "var(--font-playfair), Georgia, 'Times New Roman', serif";
const cinzel = "var(--font-cinzel), Palatino, 'Palatino Linotype', serif";
const editorial = "var(--font-cormorant), Georgia, serif";
const sans = "var(--font-sans), system-ui, sans-serif";

export type CeleCardOriginStyle = "letterhead" | "credit" | "stamp" | "neon" | "masthead" | "carved";
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

/** Letterhead cards keep given names and family name on separate lines at every width. */
export function celecardDisplayNameLines(name: string, stack: boolean): string[] {
  const trimmed = name.replace(/\s+/g, " ").trim();
  if (!trimmed) return [""];
  if (!stack) return [trimmed];
  const parts = trimmed.split(" ");
  if (parts.length < 2) return [trimmed];
  return [parts.slice(0, -1).join(" "), parts[parts.length - 1]];
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

/** Stack given name and family name only when one line would read too small. */
export function celecardNameShouldStack(name: string, stackedVoice: boolean, compact = false): boolean {
  if (!stackedVoice) return false;
  if (celecardDisplayNameLines(name, true).length < 2) return false;
  return celecardNameFitCqw(name, false, compact) < 5;
}

export function celecardTypeVoice(theme: DigitalCardTheme): CeleCardTypeVoice {
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

function inkOn(hex: string) {
  return hexLum(hex) < 158 ? "#fff8ef" : "#16120e";
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
  stage: { darkStage: boolean; stageHex?: string }
): CeleCardDockFinish {
  const voice = celecardTypeVoice(theme);
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
      : originStyle === "stamp"
        ? "0.65rem"
        : originStyle === "neon"
          ? "0.9rem"
          : "1.5rem";
  const actionRadius =
    originStyle === "credit"
      ? "999px"
      : originStyle === "stamp"
        ? "0.48rem"
        : originStyle === "neon"
          ? "0.7rem"
          : "1.1rem";
  const tracking =
    originStyle === "credit" || originStyle === "neon" ? "0.14em" : originStyle === "stamp" ? "0.04em" : "0.12em";

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
    ghostBg: dark ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.55)",
    ghostFg: dark ? "#f4e6c8" : theme.text,
    ghostBorder: "transparent",
    font: voice.origin,
    tracking,
    labelTransform: originStyle === "stamp" ? "none" : "uppercase",
    foil: originStyle === "letterhead" || originStyle === "carved",
  };
}
