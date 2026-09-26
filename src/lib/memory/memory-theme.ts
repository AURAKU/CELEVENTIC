import type { CSSProperties } from "react";
import {
  aureliaFamilyDefaults,
  isAureliaEditorialLayout,
  mergeAureliaWedding,
} from "@/lib/experience/aurelia-editorial";
import {
  GIFT_THEME_PRESETS,
  giftThemeToCssVars,
  resolveGiftTheme,
  type GiftTheme,
} from "@/lib/gifts/gift-theme";
import { invitationLayoutSlug } from "@/lib/memory/memory-album-identity";
import type { InvitationDesignConfig } from "@/types/invitation-design";

/** Memory Vault inherits invitation look the same way gifts do. */
export type MemoryTheme = GiftTheme;

export type MemoryThemeCssVars = CSSProperties & Record<`--memory-${string}`, string>;

function resolveAureliaMemoryTheme(
  design: Partial<InvitationDesignConfig> | null | undefined,
  layout: string
): MemoryTheme {
  const preset = GIFT_THEME_PRESETS[layout] ?? GIFT_THEME_PRESETS["aurelia-editorial-wedding"];
  const config = mergeAureliaWedding(design?.experience?.aureliaWedding, aureliaFamilyDefaults(layout));
  const tokens = config.theme;
  return {
    ...preset,
    id: layout,
    name: preset?.name ?? "Aurelia Editorial",
    colors: {
      primary: tokens.espresso,
      accent: tokens.terracotta,
      accentSoft: tokens.blush,
      surface: tokens.ivory,
      surfaceAlt: tokens.cream,
      ink: tokens.text,
      inkMuted: tokens.brown,
      border: tokens.champagne,
      onAccent: tokens.ivory,
    },
    fonts: {
      display: 'var(--font-cinzel), "Cinzel", "Times New Roman", serif',
      body: 'var(--font-cormorant), "Cormorant Garamond", Georgia, serif',
      script: 'var(--font-great-vibes), "Great Vibes", cursive',
    },
    radius: 0,
    ornament: "gilded",
  };
}

export function resolveMemoryTheme(input?: {
  design?: Partial<InvitationDesignConfig> | null;
  presetId?: string | null;
  templateSlug?: string | null;
}): MemoryTheme {
  const layout = invitationLayoutSlug(input?.design, input?.templateSlug ?? input?.presetId);
  if (isAureliaEditorialLayout(layout)) {
    return resolveAureliaMemoryTheme(input?.design, layout);
  }
  return resolveGiftTheme(input);
}

export function memoryThemeToCssVars(theme: MemoryTheme): MemoryThemeCssVars {
  const gift = giftThemeToCssVars(theme);
  return {
    "--memory-color-primary": gift["--gift-color-primary"],
    "--memory-color-accent": gift["--gift-color-accent"],
    "--memory-color-accent-soft": gift["--gift-color-accent-soft"],
    "--memory-color-surface": gift["--gift-color-surface"],
    "--memory-color-surface-alt": gift["--gift-color-surface-alt"],
    "--memory-color-ink": gift["--gift-color-ink"],
    "--memory-color-ink-muted": gift["--gift-color-ink-muted"],
    "--memory-color-border": gift["--gift-color-border"],
    "--memory-color-on-accent": gift["--gift-color-on-accent"],
    "--memory-font-display": gift["--gift-font-display"],
    "--memory-font-body": gift["--gift-font-body"],
    "--memory-font-script": gift["--gift-font-script"],
    "--memory-radius": gift["--gift-radius"],
  };
}

export function serializeMemoryTheme(theme: MemoryTheme) {
  return {
    id: theme.id,
    name: theme.name,
    colors: theme.colors,
    fonts: theme.fonts,
    radius: theme.radius,
    ornament: theme.ornament,
    cssVars: memoryThemeToCssVars(theme),
  };
}
