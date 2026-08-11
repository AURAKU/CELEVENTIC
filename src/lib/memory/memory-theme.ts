import type { CSSProperties } from "react";
import {
  giftThemeToCssVars,
  resolveGiftTheme,
  type GiftTheme,
} from "@/lib/gifts/gift-theme";
import type { InvitationDesignConfig } from "@/types/invitation-design";

/** Memory Vault inherits invitation look the same way gifts do. */
export type MemoryTheme = GiftTheme;

export type MemoryThemeCssVars = CSSProperties & Record<`--memory-${string}`, string>;

export function resolveMemoryTheme(input?: {
  design?: Partial<InvitationDesignConfig> | null;
  presetId?: string | null;
  templateSlug?: string | null;
}): MemoryTheme {
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
