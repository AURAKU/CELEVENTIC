/**
 * Canonical couple display name is Event.hostName.
 * Older create-event drafts and workspace configuration.typeSpecific may still
 * store a duplicate key `coupleNames` — resolve to hostName when reading.
 */
export function resolveCoupleName(input: {
  hostName?: string | null;
  coupleNames?: string | null;
}): string {
  const host = input.hostName?.trim() ?? "";
  if (host) return host;
  return input.coupleNames?.trim() ?? "";
}

/** Legacy alias written into typeSpecific for older readers of workspace config. */
export function coupleNamesLegacyAlias(hostName: string): string {
  return hostName.trim();
}
