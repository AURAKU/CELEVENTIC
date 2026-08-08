/**
 * Per-event vendor pass types.
 *
 * The picker an organiser sees is the platform's built-in list, filtered by
 * this event's overrides and extended with the event's own types. Everything
 * here is scoped to one event: adding "Catering" to a wedding never changes
 * anybody else's picker.
 *
 * Passes issued against a custom type are stored as `passType = CUSTOM` with
 * the label snapshotted into `categoryLabel`, so a type can be retired without
 * touching a single already-printed card.
 */

import type { VendorTeamPassType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import {
  BUILTIN_VENDOR_PASS_TYPES,
  isBuiltinVendorPassTypeKey,
  mergeVendorPassTypeOptions,
  normalizeVendorPassTypeLabel,
  parseVendorPassTypeValue,
  resolveVendorPassTypeCreate,
  resolveVendorPassTypeDeletion,
  slugifyVendorPassTypeKey,
  type VendorPassTypeOption,
  type VendorPassTypeOverride,
  type VendorPassTypeSource,
} from "@/lib/vendor-pass/pass-types";

/** Reading the picker is as wide as reading the pass list — door staff included. */
export const VENDOR_PASS_TYPE_READ_PERMISSIONS = [
  EventPermissionKey.MANAGE_VENDOR_ACCESS,
  EventPermissionKey.MANAGE_GUESTS,
  EventPermissionKey.SCAN_QR,
] as const;

/** Changing the picker is an organiser/admin act; scanning alone is not enough. */
export const VENDOR_PASS_TYPE_WRITE_PERMISSIONS = [
  EventPermissionKey.MANAGE_VENDOR_ACCESS,
  EventPermissionKey.MANAGE_GUESTS,
] as const;

export class VendorPassTypeError extends Error {
  readonly status: number;
  readonly requiresConfirmation: boolean;

  constructor(message: string, status = 400, requiresConfirmation = false) {
    super(message);
    this.name = "VendorPassTypeError";
    this.status = status;
    this.requiresConfirmation = requiresConfirmation;
  }
}

async function loadOverrides(eventId: string): Promise<VendorPassTypeOverride[]> {
  const rows = await prisma.eventVendorPassType.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    key: row.key,
    label: row.label,
    source: row.source,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  }));
}

/** Live passes issued against one type — the in-use guard for deletion. */
export async function countVendorPassTypeUsage(input: {
  eventId: string;
  key: string;
  label?: string | null;
  source: VendorPassTypeSource;
}): Promise<number> {
  if (input.source === "SYSTEM") {
    return prisma.vendorTeamPass.count({
      where: {
        eventId: input.eventId,
        archivedAt: null,
        passType: input.key as VendorTeamPassType,
      },
    });
  }
  const label = input.label?.trim();
  if (!label) return 0;
  return prisma.vendorTeamPass.count({
    where: {
      eventId: input.eventId,
      archivedAt: null,
      passType: "CUSTOM",
      categoryLabel: label,
    },
  });
}

export interface VendorPassTypeListItem extends VendorPassTypeOption {
  inUseCount: number;
}

export interface VendorPassTypeListing {
  options: VendorPassTypeOption[];
  /** Custom types with their usage, for the manage panel. */
  managed: VendorPassTypeListItem[];
  /** Built-ins this event has hidden, offered back as one-click restores. */
  hidden: Array<{ key: string; label: string }>;
}

export async function listEventVendorPassTypes(eventId: string): Promise<VendorPassTypeListing> {
  const overrides = await loadOverrides(eventId);
  const options = mergeVendorPassTypeOptions(overrides);

  const customs = options.filter((option) => option.source === "CUSTOM");
  const usage = await Promise.all(
    customs.map((option) =>
      countVendorPassTypeUsage({
        eventId,
        key: option.key,
        label: option.label,
        source: "CUSTOM",
      })
    )
  );

  const hidden = overrides
    .filter((row) => !row.isActive && isBuiltinVendorPassTypeKey(row.key))
    .map((row) => ({
      key: row.key,
      label:
        BUILTIN_VENDOR_PASS_TYPES.find((option) => option.value === row.key)?.label ??
        row.label,
    }));

  return {
    options,
    managed: customs.map((option, index) => ({ ...option, inUseCount: usage[index] ?? 0 })),
    hidden,
  };
}

/**
 * Add a type to this event's picker. Passing the name (or key) of a built-in
 * the event previously hid restores it instead of erroring — that is the undo
 * path for a hidden built-in.
 */
export async function createEventVendorPassType(input: {
  eventId: string;
  actorUserId: string;
  label?: string | null;
  key?: string | null;
}): Promise<VendorPassTypeOption> {
  const overrides = await loadOverrides(input.eventId);

  const requestedKey = input.key ? slugifyVendorPassTypeKey(input.key) : "";
  const builtinByKey = requestedKey
    ? BUILTIN_VENDOR_PASS_TYPES.find((option) => option.value === requestedKey)
    : undefined;

  const label = builtinByKey
    ? builtinByKey.label
    : normalizeVendorPassTypeLabel(input.label ?? "");

  const decision = resolveVendorPassTypeCreate(
    builtinByKey ? builtinByKey.label : label,
    overrides
  );
  if (!decision.ok) throw new VendorPassTypeError(decision.error, 409);

  const isBuiltin = isBuiltinVendorPassTypeKey(decision.key);
  const source: VendorPassTypeSource = isBuiltin ? "SYSTEM" : "CUSTOM";
  const nextSort = overrides.reduce((max, row) => Math.max(max, row.sortOrder ?? 0), 0) + 1;

  const row = await prisma.eventVendorPassType.upsert({
    where: { eventId_key: { eventId: input.eventId, key: decision.key } },
    create: {
      eventId: input.eventId,
      key: decision.key,
      label: decision.label,
      source,
      isActive: true,
      sortOrder: nextSort,
      createdById: input.actorUserId,
    },
    update: { isActive: true, label: decision.label },
  });

  await createAuditLog({
    userId: input.actorUserId,
    action: "CREATE",
    entity: "event_vendor_pass_type",
    entityId: row.id,
    details: {
      kind: isBuiltin ? "vendor_pass_type_restored" : "vendor_pass_type_created",
      eventId: input.eventId,
      key: row.key,
      label: row.label,
    },
  });

  return {
    value: source === "CUSTOM" ? `CUSTOM:${row.key}` : row.key,
    key: row.key,
    label: row.label,
    source,
    id: row.id,
    deletable: source === "CUSTOM",
  };
}

export interface VendorPassTypeDeleteResult {
  action: "delete" | "deactivate" | "hide";
  key: string;
  message: string;
  inUseCount: number;
}

/**
 * Remove a type from this event's picker.
 *
 * Built-ins are hidden, never destroyed. A custom type in use is deactivated so
 * its passes keep their snapshotted label; only an unused one is deleted.
 */
export async function deleteEventVendorPassType(input: {
  eventId: string;
  actorUserId: string;
  key: string;
  confirm?: boolean;
}): Promise<VendorPassTypeDeleteResult> {
  const key = slugifyVendorPassTypeKey(input.key);
  if (!key) throw new VendorPassTypeError("Unknown pass type.", 404);

  const existing = await prisma.eventVendorPassType.findUnique({
    where: { eventId_key: { eventId: input.eventId, key } },
  });
  const isBuiltin = isBuiltinVendorPassTypeKey(key);

  if (!existing && !isBuiltin) {
    throw new VendorPassTypeError("Pass type not found for this event.", 404);
  }
  if (existing && !existing.isActive) {
    throw new VendorPassTypeError("Pass type is already removed.", 409);
  }

  const source: VendorPassTypeSource = isBuiltin ? "SYSTEM" : "CUSTOM";
  const label = existing?.label ?? null;
  const inUseCount = await countVendorPassTypeUsage({
    eventId: input.eventId,
    key,
    label,
    source,
  });

  const decision = resolveVendorPassTypeDeletion({
    key,
    source,
    inUseCount,
    confirm: input.confirm,
  });
  if (!decision.ok) {
    throw new VendorPassTypeError(decision.error, 409, decision.requiresConfirmation);
  }

  if (decision.action === "delete" && existing) {
    await prisma.eventVendorPassType.delete({ where: { id: existing.id } });
  } else {
    await prisma.eventVendorPassType.upsert({
      where: { eventId_key: { eventId: input.eventId, key } },
      create: {
        eventId: input.eventId,
        key,
        label:
          label ??
          BUILTIN_VENDOR_PASS_TYPES.find((option) => option.value === key)?.label ??
          key,
        source,
        isActive: false,
        createdById: input.actorUserId,
      },
      update: { isActive: false },
    });
  }

  await createAuditLog({
    userId: input.actorUserId,
    action: "DELETE",
    entity: "event_vendor_pass_type",
    entityId: existing?.id ?? key,
    details: {
      kind: `vendor_pass_type_${decision.action}`,
      eventId: input.eventId,
      key,
      label,
      inUseCount,
    },
  });

  return { action: decision.action, key, message: decision.message, inUseCount };
}

/**
 * Turn whatever the client selected into the columns a pass is stored with.
 * Unknown or retired types are refused here rather than in the UI, so a stale
 * tab (or a hand-rolled request) cannot mint a pass against a dead type.
 */
export async function resolveVendorPassTypeSelection(input: {
  eventId: string;
  value?: string | null;
  categoryLabel?: string | null;
}): Promise<{ passType: VendorTeamPassType; categoryLabel: string | null }> {
  const fallbackLabel = input.categoryLabel?.trim() || null;
  if (!input.value) {
    return { passType: "VENDOR", categoryLabel: fallbackLabel };
  }

  const parsed = parseVendorPassTypeValue(input.value);
  const options = mergeVendorPassTypeOptions(await loadOverrides(input.eventId));

  if (parsed.customKey) {
    const match = options.find(
      (option) => option.source === "CUSTOM" && option.key === parsed.customKey
    );
    if (!match) {
      throw new VendorPassTypeError("That pass type is no longer available for this event.", 400);
    }
    return { passType: "CUSTOM", categoryLabel: match.label };
  }

  const builtin = options.find(
    (option) => option.source === "SYSTEM" && option.key === parsed.passType
  );
  if (!builtin) {
    if (!isBuiltinVendorPassTypeKey(parsed.passType)) {
      throw new VendorPassTypeError("Unknown pass type.", 400);
    }
    throw new VendorPassTypeError("That pass type is hidden for this event.", 400);
  }

  // `CUSTOM` is itself a built-in ("Other Custom Team"); it keeps any free-text
  // label the caller supplied.
  return {
    passType: builtin.key as VendorTeamPassType,
    categoryLabel: builtin.key === "CUSTOM" ? fallbackLabel : null,
  };
}
