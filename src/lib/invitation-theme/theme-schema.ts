import { z } from "zod";
import type { InvitationThemeTokens } from "./theme-types";

const fontIdSchema = z.enum(["playfair", "cinzel", "great-vibes", "cormorant", "poppins"]);

export const invitationThemeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.object({
    primary: z.string().min(1),
    secondary: z.string().min(1),
    accent: z.string().min(1),
    surface: z.string().min(1),
    surfaceAlt: z.string().min(1),
    ink: z.string().min(1),
    inkMuted: z.string().min(1),
    overlay: z.string().min(1),
  }),
  typography: z.object({
    displayFont: fontIdSchema,
    bodyFont: fontIdSchema,
    scriptFont: fontIdSchema,
    scale: z.number().min(0.85).max(1.2),
    letterSpacing: z.enum(["tight", "normal", "wide", "grand"]),
  }),
  texture: z.object({
    backgroundTexture: z.enum(["none", "paper", "linen", "velvet-vignette"]),
    dividerStyle: z.enum(["none", "hairline", "flourish", "double-rule"]),
    frameStyle: z.enum(["none", "hairline", "gilded", "arch"]),
    foilEffect: z.enum(["none", "gold", "silver"]),
  }),
  motif: z.object({
    packId: z.string(),
    placements: z.record(z.string()).default({}),
  }),
  motion: z.object({
    profileId: z.enum(["still", "gentle-drift", "layered-drift", "solemn"]),
    intensity: z.number().min(0).max(1),
  }),
  spacing: z.object({
    pagePadding: z.enum(["compact", "regular", "grand"]),
    blockGap: z.enum(["tight", "regular", "airy"]),
    radius: z.number().min(0).max(48),
    shadow: z.enum(["none", "soft", "lifted"]),
  }),
});

/** Safe-parse untrusted JSON (DB designConfig) into theme tokens; null when invalid. */
export function parseThemeTokens(json: unknown): InvitationThemeTokens | null {
  const result = invitationThemeSchema.safeParse(json);
  return result.success ? (result.data as InvitationThemeTokens) : null;
}
