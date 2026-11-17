import type { ComponentType } from "react";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import {
  canRegisterStudio3Version,
  resolveLayoutVersion,
  shouldUseLegacyInvitationRenderer,
  studio3LayoutKey,
} from "@/lib/invitation/layout-version";

/**
 * Experience 3.0 visual registry.
 *
 * Only layoutVersion ≥ 2 may register. The map starts empty so every current
 * invitation (missing / v1 pin) stays on the legacy renderer.
 */

// Loose props typing so registry stays free of circular imports with the
// invitation-renderer module. Concrete templates cast at registration time.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Experience3LayoutComponent = ComponentType<any>;

const EXPERIENCE3_LAYOUT_REGISTRY = new Map<string, Experience3LayoutComponent>();

export type InvitationLayoutBranch =
  | { mode: "legacy"; version: number }
  | { mode: "experience3"; version: number; registryKey: string }
  | { mode: "experience3-unregistered"; version: number; registryKey: string };

export function resolveInvitationLayoutBranch(
  design: Pick<InvitationDesignConfig, "layout" | "layoutVersion">
): InvitationLayoutBranch {
  const version = resolveLayoutVersion(design);
  if (shouldUseLegacyInvitationRenderer(design)) {
    return { mode: "legacy", version };
  }
  const registryKey = studio3LayoutKey(design.layout, version);
  if (EXPERIENCE3_LAYOUT_REGISTRY.has(registryKey)) {
    return { mode: "experience3", version, registryKey };
  }
  return { mode: "experience3-unregistered", version, registryKey };
}

export function registerExperience3Layout(
  layout: string,
  version: number,
  component: Experience3LayoutComponent
): { ok: true; key: string } | { ok: false; reason: string } {
  const gate = canRegisterStudio3Version(layout, version);
  if (!gate.ok) {
    return { ok: false, reason: gate.reason ?? "registration rejected" };
  }
  const key = studio3LayoutKey(layout, version);
  EXPERIENCE3_LAYOUT_REGISTRY.set(key, component);
  return { ok: true, key };
}

export function getExperience3Layout(
  layout: string,
  version: number
): Experience3LayoutComponent | null {
  if (version < 2) return null;
  return EXPERIENCE3_LAYOUT_REGISTRY.get(studio3LayoutKey(layout, version)) ?? null;
}

export function listRegisteredExperience3Keys(): string[] {
  return [...EXPERIENCE3_LAYOUT_REGISTRY.keys()].sort();
}

/** Test helper — clears registrations without touching legacy templates. */
export function __resetExperience3LayoutRegistryForTests(): void {
  EXPERIENCE3_LAYOUT_REGISTRY.clear();
}
