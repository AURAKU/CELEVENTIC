/**
 * Vendor pass types — pure rules, unit-tested without Prisma.
 *
 * The platform ships a fixed set of built-in types (the `VendorTeamPassType`
 * enum). On top of that, each event carries its own list of organiser-created
 * types, plus overrides that hide built-ins the organiser does not want in
 * their picker.
 *
 * Two deliberate choices, both about not breaking passes already in vendors'
 * hands:
 *
 *  - **Built-ins are never deleted**, only hidden for the event. They are
 *    enum values shared by every event on the platform, and a pass issued as
 *    `SECURITY` must keep reading "Security Team" at the gate forever.
 *  - **A custom type in use is soft-deleted** (deactivated) rather than
 *    removed. The label was snapshotted onto each pass at issue time, so the
 *    cards keep working and keep their wording; the type simply stops being
 *    offered for new passes. Only an unused custom type is hard-deleted.
 */

import { VENDOR_PASS_TYPE_OPTIONS } from "./capacity";

export type VendorPassTypeSource = "SYSTEM" | "CUSTOM";

/** A row from `event_vendor_pass_types`, narrowed to what the rules need. */
export interface VendorPassTypeOverride {
  id: string;
  key: string;
  label: string;
  source: string;
  isActive: boolean;
  sortOrder?: number | null;
}

export interface VendorPassTypeOption {
  /** Value carried by the `<select>`: enum key, or `CUSTOM:<KEY>`. */
  value: string;
  key: string;
  label: string;
  source: VendorPassTypeSource;
  /** Row id when this option is backed by an event-scoped record. */
  id: string | null;
  /** Built-ins can only be hidden; custom types can be removed outright. */
  deletable: boolean;
}

export const BUILTIN_VENDOR_PASS_TYPES = VENDOR_PASS_TYPE_OPTIONS;

export const BUILTIN_VENDOR_PASS_TYPE_KEYS: readonly string[] =
  BUILTIN_VENDOR_PASS_TYPES.map((option) => option.value);

const MAX_LABEL_LENGTH = 60;
const MAX_KEY_LENGTH = 60;
/** Prefix that marks an event-scoped type inside a single select value. */
const CUSTOM_VALUE_PREFIX = "CUSTOM:";

export function isBuiltinVendorPassTypeKey(key: string): boolean {
  return BUILTIN_VENDOR_PASS_TYPE_KEYS.includes(key.trim().toUpperCase());
}

/** Collapse whitespace; the label is what a vendor reads on a printed card. */
export function normalizeVendorPassTypeLabel(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_LABEL_LENGTH);
}

/**
 * Derive the storage key for a label. Two labels that differ only by case,
 * punctuation or spacing land on the same key, which is what stops "DJ Crew"
 * and "dj-crew" becoming two indistinguishable rows in the picker.
 */
export function slugifyVendorPassTypeKey(raw: string): string {
  return normalizeVendorPassTypeLabel(raw)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_KEY_LENGTH);
}

export function vendorPassTypeValue(key: string, source: VendorPassTypeSource): string {
  return source === "CUSTOM" && !isBuiltinVendorPassTypeKey(key)
    ? `${CUSTOM_VALUE_PREFIX}${key}`
    : key;
}

/** Split a select value back into the enum type and (for custom) its key. */
export function parseVendorPassTypeValue(value: string): {
  passType: string;
  customKey: string | null;
} {
  const raw = (value ?? "").trim();
  if (raw.startsWith(CUSTOM_VALUE_PREFIX)) {
    const key = raw.slice(CUSTOM_VALUE_PREFIX.length).trim().toUpperCase();
    return { passType: "CUSTOM", customKey: key || null };
  }
  return { passType: raw.toUpperCase() || "VENDOR", customKey: null };
}

/**
 * The picker for one event: built-ins (minus the hidden ones, with organiser
 * relabels applied) followed by the event's own types.
 */
export function mergeVendorPassTypeOptions(
  overrides: VendorPassTypeOverride[] = []
): VendorPassTypeOption[] {
  const systemByKey = new Map<string, VendorPassTypeOverride>();
  const custom: VendorPassTypeOverride[] = [];

  for (const row of overrides) {
    const key = row.key.trim().toUpperCase();
    if (!key) continue;
    if (row.source === "SYSTEM" || isBuiltinVendorPassTypeKey(key)) {
      systemByKey.set(key, { ...row, key });
    } else {
      custom.push({ ...row, key });
    }
  }

  const builtins: VendorPassTypeOption[] = [];
  for (const option of BUILTIN_VENDOR_PASS_TYPES) {
    const override = systemByKey.get(option.value);
    if (override && !override.isActive) continue;
    builtins.push({
      value: option.value,
      key: option.value,
      label: override?.label?.trim() || option.label,
      source: "SYSTEM",
      id: override?.id ?? null,
      deletable: false,
    });
  }

  const customOptions = custom
    .filter((row) => row.isActive)
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label)
    )
    .map<VendorPassTypeOption>((row) => ({
      value: vendorPassTypeValue(row.key, "CUSTOM"),
      key: row.key,
      label: row.label,
      source: "CUSTOM",
      id: row.id,
      deletable: true,
    }));

  return [...builtins, ...customOptions];
}

export type VendorPassTypeCreateDecision =
  | { ok: true; key: string; label: string }
  | { ok: false; error: string };

/**
 * Validate a new organiser-created type against the built-ins and the event's
 * existing rows. Reviving a previously hidden type is a create, not an error —
 * that is how an organiser undoes a deletion.
 */
export function resolveVendorPassTypeCreate(
  rawLabel: string,
  existing: VendorPassTypeOverride[] = []
): VendorPassTypeCreateDecision {
  const label = normalizeVendorPassTypeLabel(rawLabel ?? "");
  if (label.length < 2) {
    return { ok: false, error: "Enter a pass type name (at least 2 characters)." };
  }
  const key = slugifyVendorPassTypeKey(label);
  if (key.length < 2) {
    return { ok: false, error: "Use letters or numbers in the pass type name." };
  }

  const builtin = BUILTIN_VENDOR_PASS_TYPES.find(
    (option) =>
      option.value === key || slugifyVendorPassTypeKey(option.label) === key
  );
  const hiddenBuiltin = existing.find(
    (row) => row.key.toUpperCase() === (builtin?.value ?? key) && !row.isActive
  );
  if (builtin && !hiddenBuiltin) {
    return { ok: false, error: `"${builtin.label}" is already a pass type.` };
  }

  const clash = existing.find((row) => row.key.toUpperCase() === key && row.isActive);
  if (clash) {
    return { ok: false, error: `"${clash.label}" is already a pass type.` };
  }

  return { ok: true, key: builtin?.value ?? key, label };
}

export type VendorPassTypeDeleteDecision =
  | { ok: true; action: "delete" | "deactivate" | "hide"; key: string; message: string }
  | { ok: false; error: string; requiresConfirmation: boolean };

/**
 * Decide what removing a pass type means. In-use types are never destroyed:
 * a built-in is hidden and a custom type is deactivated, both only after the
 * organiser confirms, so no printed card is ever silently invalidated.
 */
export function resolveVendorPassTypeDeletion(input: {
  key: string;
  source: VendorPassTypeSource;
  /** Live (non-archived) passes issued against this type. */
  inUseCount: number;
  confirm?: boolean;
}): VendorPassTypeDeleteDecision {
  const key = input.key.trim().toUpperCase();
  if (!key) return { ok: false, error: "Unknown pass type.", requiresConfirmation: false };

  const inUse = Math.max(0, Math.trunc(input.inUseCount));
  const passWord = inUse === 1 ? "pass" : "passes";

  if (input.source === "SYSTEM") {
    if (inUse > 0 && !input.confirm) {
      return {
        ok: false,
        error: `${inUse} ${passWord} still use this type. Hiding it keeps those passes working but removes it from new passes — confirm to continue.`,
        requiresConfirmation: true,
      };
    }
    return {
      ok: true,
      action: "hide",
      key,
      message: "Built-in pass type hidden for this event.",
    };
  }

  if (inUse > 0) {
    if (!input.confirm) {
      return {
        ok: false,
        error: `${inUse} ${passWord} still use this type. Removing it keeps those passes working but stops it being offered for new ones — confirm to continue.`,
        requiresConfirmation: true,
      };
    }
    return {
      ok: true,
      action: "deactivate",
      key,
      message: "Pass type removed from the picker. Existing passes keep their label.",
    };
  }

  return { ok: true, action: "delete", key, message: "Pass type deleted." };
}

/** What a human should read for a pass's type, custom labels included. */
export function vendorPassTypeLabel(
  passType: string,
  categoryLabel?: string | null
): string {
  const custom = categoryLabel?.trim();
  if (custom) return custom;
  const builtin = BUILTIN_VENDOR_PASS_TYPES.find((option) => option.value === passType);
  return builtin?.label ?? passType.replace(/_/g, " ");
}
