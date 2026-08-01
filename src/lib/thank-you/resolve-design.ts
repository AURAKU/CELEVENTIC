/**
 * Resolve Thank You design from page JSON + optional invitation theme inheritance.
 */

import { getThankYouTemplate, templateToResolvedDesign } from "./templates";
import {
  DEFAULT_GUESTBOOK_CONFIG,
  DEFAULT_SECTION_CONFIG,
  DEFAULT_SHARING_CONFIG,
  type ThankYouDesignConfig,
  type ThankYouGuestbookConfig,
  type ThankYouSectionConfig,
  type ThankYouSectionConfigItem,
  type ThankYouSharingConfig,
  type ThankYouThemeSource,
  type ResolvedThankYouDesign,
} from "./types";
import { FONT_STACKS, resolveThankYouFontStack } from "@/lib/invitation-theme/fonts";
import type { FontId } from "@/lib/invitation-theme/theme-types";

export interface InvitationThemeHint {
  primaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  mutedTextColor?: string | null;
  displayFont?: string | null;
  bodyFont?: string | null;
  scriptFont?: string | null;
  logoUrl?: string | null;
  backgroundImageUrl?: string | null;
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function parseDesignConfig(raw: unknown): ThankYouDesignConfig {
  return asObject(raw) as ThankYouDesignConfig;
}

export function parseSectionConfig(raw: unknown): ThankYouSectionConfig {
  const obj = asObject(raw);
  const sections = Array.isArray(obj.sections) ? obj.sections : null;
  if (!sections?.length) return structuredClone(DEFAULT_SECTION_CONFIG);
  const normalized: ThankYouSectionConfigItem[] = sections
    .map((item, index) => {
      const row = asObject(item);
      const id = String(row.id ?? "") as ThankYouSectionConfigItem["id"];
      if (!id) return null;
      return {
        id,
        enabled: row.enabled !== false,
        order: typeof row.order === "number" ? row.order : index + 1,
        layout: typeof row.layout === "string" ? row.layout : undefined,
        heading: typeof row.heading === "string" ? row.heading : undefined,
        description: typeof row.description === "string" ? row.description : undefined,
      } satisfies ThankYouSectionConfigItem;
    })
    .filter(Boolean) as ThankYouSectionConfigItem[];

  // Ensure new sections appear for older configs.
  for (const fallback of DEFAULT_SECTION_CONFIG.sections) {
    if (!normalized.some((section) => section.id === fallback.id)) {
      normalized.push({ ...fallback, enabled: false, order: normalized.length + 1 });
    }
  }

  return {
    sections: normalized.sort((a, b) => a.order - b.order),
  };
}

export function parseGuestbookConfig(raw: unknown): ThankYouGuestbookConfig {
  return { ...DEFAULT_GUESTBOOK_CONFIG, ...asObject(raw) } as ThankYouGuestbookConfig;
}

export function parseSharingConfig(raw: unknown): ThankYouSharingConfig {
  return { ...DEFAULT_SHARING_CONFIG, ...asObject(raw) } as ThankYouSharingConfig;
}

export function parseFeaturedMemoryIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && id.length > 0).slice(0, 24);
}

function fontStack(fontId?: string | null): string | undefined {
  if (!fontId) return undefined;
  if (fontId in FONT_STACKS) return FONT_STACKS[fontId as FontId];
  if (fontId.includes(",") || fontId.startsWith("var(")) return fontId;
  return resolveThankYouFontStack(fontId);
}

export function resolveThankYouDesign(input: {
  templateId?: string | null;
  themeSource?: string | null;
  designConfig?: unknown;
  invitation?: InvitationThemeHint | null;
  pageBackgroundImageUrl?: string | null;
  pageBackgroundVideoUrl?: string | null;
}): ResolvedThankYouDesign {
  const design = parseDesignConfig(input.designConfig);
  const themeSource = (input.themeSource ||
    design.themeSource ||
    "INVITATION") as ThankYouThemeSource;
  const template = getThankYouTemplate(design.templateId || input.templateId || "eternal-ivory");
  const base = templateToResolvedDesign(template, {
    ...design,
    themeSource,
    backgroundImageUrl:
      design.backgroundImageUrl ??
      input.pageBackgroundImageUrl ??
      input.invitation?.backgroundImageUrl ??
      null,
    backgroundVideoUrl: design.backgroundVideoUrl ?? input.pageBackgroundVideoUrl ?? null,
  });

  if (themeSource === "INVITATION" && input.invitation) {
    const inv = input.invitation;
    if (inv.backgroundColor) base.backgroundColor = inv.backgroundColor;
    if (inv.primaryColor || inv.accentColor) {
      base.accentColor = inv.accentColor || inv.primaryColor || base.accentColor;
    }
    if (inv.primaryColor) base.secondaryAccentColor = inv.primaryColor;
    if (inv.textColor) base.textColor = inv.textColor;
    if (inv.mutedTextColor) base.mutedTextColor = inv.mutedTextColor;
    const display = fontStack(inv.displayFont);
    const body = fontStack(inv.bodyFont);
    const script = fontStack(inv.scriptFont);
    if (display) base.displayFontStack = display;
    if (body) {
      base.bodyFontStack = body;
      base.eyebrowFontStack = body;
    }
    if (script) base.scriptFontStack = script;
    if (inv.backgroundImageUrl && !base.backgroundImageUrl) {
      base.backgroundImageUrl = inv.backgroundImageUrl;
    }
    base.themeSource = "INVITATION";
    base.isLight =
      0.2126 *
        Number.parseInt(base.backgroundColor.replace("#", "").slice(0, 2) || "80", 16) /
        255 +
        0.7152 *
          Number.parseInt(base.backgroundColor.replace("#", "").slice(2, 4) || "80", 16) /
          255 +
        0.0722 *
          Number.parseInt(base.backgroundColor.replace("#", "").slice(4, 6) || "80", 16) /
          255 >
      0.55;
  }

  if (themeSource === "CUSTOM" || themeSource === "PRESET") {
    base.themeSource = themeSource;
  }

  return base;
}

export function orderedEnabledSections(config: ThankYouSectionConfig) {
  return config.sections.filter((section) => section.enabled).sort((a, b) => a.order - b.order);
}

export function isGuestbookOpen(config: ThankYouGuestbookConfig): boolean {
  if (config.enabled === false) return false;
  if (!config.closedAt) return true;
  const closed = Date.parse(config.closedAt);
  if (!Number.isFinite(closed)) return true;
  return Date.now() < closed;
}
