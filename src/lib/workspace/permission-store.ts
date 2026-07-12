import { prisma } from "@/lib/prisma";
import type { EventCollaboratorRole } from "@prisma/client";
import {
  ALL_EVENT_PERMISSION_KEYS,
  EVENT_PERMISSION_META,
  type EventPermissionKey,
} from "./permission-keys";
import { DEFAULT_ROLE_PERMISSIONS } from "./default-role-permissions";

let seeded = false;

export async function ensureWorkspacePermissionsSeeded() {
  if (seeded) return;
  const count = await prisma.workspacePermissionDefinition.count();
  if (count > 0) {
    seeded = true;
    return;
  }

  for (const [index, key] of ALL_EVENT_PERMISSION_KEYS.entries()) {
    const meta = EVENT_PERMISSION_META[key as EventPermissionKey];
    await prisma.workspacePermissionDefinition.upsert({
      where: { key },
      create: {
        key,
        label: meta.label,
        description: meta.description,
        category: meta.category,
        scope: "EVENT",
        sortOrder: index,
      },
      update: {},
    });
  }

  const definitions = await prisma.workspacePermissionDefinition.findMany();
  const byKey = new Map(definitions.map((d) => [d.key, d.id]));

  for (const [roleKey, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    for (const perm of permissions) {
      const permissionId = byKey.get(perm);
      if (!permissionId) continue;
      await prisma.workspaceRolePermission.upsert({
        where: { roleKey_permissionId: { roleKey, permissionId } },
        create: { roleKey, permissionId, isDefault: true },
        update: {},
      });
    }
  }

  seeded = true;
}

export async function getRoleDefaultPermissions(role: EventCollaboratorRole): Promise<string[]> {
  await ensureWorkspacePermissionsSeeded();
  const rows = await prisma.workspaceRolePermission.findMany({
    where: { roleKey: role },
    include: { permission: true },
  });
  if (rows.length === 0) {
    return [...(DEFAULT_ROLE_PERMISSIONS[role] ?? [])];
  }
  return rows.filter((r) => r.permission.isActive).map((r) => r.permission.key);
}

export async function listPermissionDefinitions() {
  await ensureWorkspacePermissionsSeeded();
  return prisma.workspacePermissionDefinition.findMany({
    where: { isActive: true, scope: "EVENT" },
    orderBy: { sortOrder: "asc" },
  });
}

export function mergePermissions(
  roleDefaults: string[],
  custom?: unknown
): Set<string> {
  const set = new Set(roleDefaults);
  if (Array.isArray(custom)) {
    for (const p of custom) {
      if (typeof p === "string") set.add(p);
    }
  }
  return set;
}
