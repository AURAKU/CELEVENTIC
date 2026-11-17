import type { InvitationDesignConfig, InvitationLayoutSlug } from "@/types/invitation-design";
import { isExperience3NativeLayout } from "@/lib/invitation/studio3/native-layouts";

/** Protected current visuals — every existing invite without an explicit pin. */
export const DEFAULT_LAYOUT_VERSION = 1;

/**
 * Layouts with verified live / seed / flagship usage.
 * Treat as immutable at version 1. Studio 3 work must register version ≥ 2 only.
 */
export const PROTECTED_LAYOUT_SLUGS = [
  "forever-afaris-wedding",
  "seraphine-champagne-wedding",
  "aurelia-editorial-wedding",
  "traditional-marriage-ceremony",
  "luxury-fashion-flagship",
  "memorial-candle-tribute",
] as const satisfies ReadonlyArray<InvitationLayoutSlug>;

export type ProtectedLayoutSlug = (typeof PROTECTED_LAYOUT_SLUGS)[number];

export function isProtectedLayout(layout: string): layout is ProtectedLayoutSlug {
  return (PROTECTED_LAYOUT_SLUGS as readonly string[]).includes(layout);
}

/**
 * Resolve the visual generation for a design.
 * Missing / invalid / &lt; 1 values collapse to v1 so legacy rows keep current rendering.
 */
export function resolveLayoutVersion(
  design: Pick<InvitationDesignConfig, "layoutVersion"> | null | undefined
): number {
  const raw = design?.layoutVersion;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return DEFAULT_LAYOUT_VERSION;
  const version = Math.trunc(raw);
  return version < DEFAULT_LAYOUT_VERSION ? DEFAULT_LAYOUT_VERSION : version;
}

export function isLegacyLayoutVersion(version: number): boolean {
  return version <= DEFAULT_LAYOUT_VERSION;
}

/** Registry key for Studio 3 component maps — never overlaps bare layout slug used by v1. */
export function studio3LayoutKey(layout: string, version: number): string {
  const v = Math.max(DEFAULT_LAYOUT_VERSION, Math.trunc(version));
  return `${layout}__v${v}`;
}

/**
 * Guard for registering a new visual generation.
 * - Existing layouts: version ≥ 2 only (v1 files stay protected).
 * - Experience 3.0 native layouts: version ≥ 1 allowed (no historical v1 to preserve).
 */
export function canRegisterStudio3Version(layout: string, version: number): {
  ok: boolean;
  reason?: string;
} {
  const v = Math.trunc(version);
  if (!layout.trim()) {
    return { ok: false, reason: "layout is required" };
  }
  if (isExperience3NativeLayout(layout)) {
    if (!Number.isFinite(v) || v < 1) {
      return { ok: false, reason: "Native Experience 3.0 layouts require layoutVersion ≥ 1." };
    }
    return { ok: true };
  }
  if (!Number.isFinite(v) || v < 2) {
    return {
      ok: false,
      reason: "Studio 3 must register layoutVersion ≥ 2; version 1 stays the protected renderer.",
    };
  }
  return { ok: true };
}

/**
 * Whether a design should use the legacy invitation-renderer switch.
 * True for all current production invites (no layoutVersion or version 1).
 * Native Experience 3.0 layouts always use the Experience 3.0 registry path.
 */
export function shouldUseLegacyInvitationRenderer(
  design: Pick<InvitationDesignConfig, "layout" | "layoutVersion">
): boolean {
  if (isExperience3NativeLayout(design.layout)) return false;
  return isLegacyLayoutVersion(resolveLayoutVersion(design));
}
