import type { InvitationLayoutSlug } from "@/types/invitation-design";

/**
 * Brand-new Experience 3.0 layout slugs.
 * These have no historical invites — safe to evolve under the Experience 3.0 registry.
 * Never reuse a protected layout slug here.
 */
export const EXPERIENCE3_NATIVE_LAYOUT_SLUGS = [
  "ix3-editorial-wedding",
  "ix3-brand-launch",
  "ix3-memorial",
] as const satisfies ReadonlyArray<InvitationLayoutSlug>;

export type Experience3NativeLayoutSlug = (typeof EXPERIENCE3_NATIVE_LAYOUT_SLUGS)[number];

export function isExperience3NativeLayout(layout: string): layout is Experience3NativeLayoutSlug {
  return (EXPERIENCE3_NATIVE_LAYOUT_SLUGS as readonly string[]).includes(layout);
}
