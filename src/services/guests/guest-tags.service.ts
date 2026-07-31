import { prisma } from "@/lib/prisma";
import {
  slugifyGuestTagLabel,
  WEDDING_GUEST_TAG_PRESETS,
} from "@/lib/guests/guest-tag-presets";

export interface GuestTagDto {
  id: string;
  label: string;
  slug: string;
  isPreset: boolean;
  sortOrder: number;
}

function toDto(row: {
  id: string;
  label: string;
  slug: string;
  isPreset: boolean;
  sortOrder: number;
}): GuestTagDto {
  return {
    id: row.id,
    label: row.label,
    slug: row.slug,
    isPreset: row.isPreset,
    sortOrder: row.sortOrder,
  };
}

/**
 * Ensure wedding presets exist for the event, then return the full catalog
 * (presets + custom tags) ordered for CRM pickers.
 */
export async function listEventGuestTags(eventId: string): Promise<GuestTagDto[]> {
  await ensurePresetGuestTags(eventId);

  const rows = await prisma.eventGuestTag.findMany({
    where: { eventId, archivedAt: null },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  return rows.map(toDto);
}

/** Idempotent seed of the wedding preset catalog for one event. */
export async function ensurePresetGuestTags(eventId: string): Promise<void> {
  // Include archived rows so a deleted preset is not silently recreated.
  const existing = await prisma.eventGuestTag.findMany({
    where: { eventId, isPreset: true },
    select: { slug: true },
  });
  const have = new Set(existing.map((row) => row.slug));
  const missing = WEDDING_GUEST_TAG_PRESETS.filter((preset) => !have.has(preset.slug));
  if (missing.length === 0) return;

  await prisma.eventGuestTag.createMany({
    data: missing.map((preset) => ({
      eventId,
      label: preset.label,
      slug: preset.slug,
      isPreset: true,
      sortOrder: preset.sortOrder,
    })),
  });
}

export class GuestTagConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuestTagConflictError";
  }
}

export class GuestTagNotFoundError extends Error {
  constructor(message = "Tag not found") {
    super(message);
    this.name = "GuestTagNotFoundError";
  }
}

/** Create a custom organizer tag for the event. */
export async function createCustomGuestTag(
  eventId: string,
  labelRaw: string
): Promise<GuestTagDto> {
  const label = labelRaw.trim().replace(/\s+/g, " ");
  if (label.length < 2 || label.length > 80) {
    throw new Error("Tag label must be between 2 and 80 characters");
  }

  await ensurePresetGuestTags(eventId);

  let slug = slugifyGuestTagLabel(label);
  const clash = await prisma.eventGuestTag.findUnique({
    where: { eventId_slug: { eventId, slug } },
  });
  if (clash) {
    if (!clash.archivedAt && clash.label.toLowerCase() === label.toLowerCase()) {
      return toDto(clash);
    }
    if (clash.archivedAt) {
      const restored = await prisma.eventGuestTag.update({
        where: { id: clash.id },
        data: {
          label,
          archivedAt: null,
          isPreset: false,
          sortOrder: clash.sortOrder,
        },
      });
      return toDto(restored);
    }
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  const maxSort = await prisma.eventGuestTag.aggregate({
    where: { eventId, archivedAt: null },
    _max: { sortOrder: true },
  });

  try {
    const created = await prisma.eventGuestTag.create({
      data: {
        eventId,
        label,
        slug,
        isPreset: false,
        sortOrder: (maxSort._max.sortOrder ?? 100) + 10,
      },
    });
    return toDto(created);
  } catch (error) {
    throw new GuestTagConflictError(
      error instanceof Error ? error.message : "Could not create that tag"
    );
  }
}

/**
 * Soft-delete an event tag from the organizer catalog.
 * Clears guest assignments and keeps the slug so presets are not re-seeded.
 */
export async function deleteEventGuestTag(
  eventId: string,
  tagId: string
): Promise<GuestTagDto> {
  const tag = await prisma.eventGuestTag.findFirst({
    where: { id: tagId, eventId, archivedAt: null },
  });
  if (!tag) throw new GuestTagNotFoundError();

  const [, archived] = await prisma.$transaction([
    prisma.guestTagAssignment.deleteMany({ where: { tagId: tag.id } }),
    prisma.eventGuestTag.update({
      where: { id: tag.id },
      data: { archivedAt: new Date() },
    }),
  ]);

  return toDto(archived);
}

/**
 * Resolve spreadsheet tag labels to event tag IDs.
 * Matches presets/custom tags case-insensitively; creates custom tags when needed.
 */
export async function resolveGuestTagLabels(
  eventId: string,
  labels: string[]
): Promise<string[]> {
  const cleaned = Array.from(
    new Set(
      labels
        .map((label) => label.trim().replace(/\s+/g, " "))
        .filter((label) => label.length >= 2 && label.length <= 80)
    )
  ).slice(0, 10);
  if (cleaned.length === 0) return [];

  await ensurePresetGuestTags(eventId);

  const ids: string[] = [];
  for (const label of cleaned) {
    try {
      const tag = await createCustomGuestTag(eventId, label);
      ids.push(tag.id);
    } catch {
      // Skip a single bad label; import generation must continue.
    }
  }
  return Array.from(new Set(ids));
}

/**
 * Replace the private tag set on a guest. Tags must belong to the same event
 * as the guest. Empty array clears all tags.
 */
export async function setGuestTags(options: {
  eventId: string;
  guestId: string;
  tagIds: string[];
}): Promise<GuestTagDto[]> {
  const guest = await prisma.guest.findFirst({
    where: { id: options.guestId, eventId: options.eventId, archivedAt: null },
    select: { id: true },
  });
  if (!guest) {
    throw new Error("Guest not found");
  }

  const uniqueIds = Array.from(new Set(options.tagIds.filter(Boolean)));
  if (uniqueIds.length > 0) {
    const tags = await prisma.eventGuestTag.findMany({
      where: { eventId: options.eventId, id: { in: uniqueIds }, archivedAt: null },
      select: { id: true },
    });
    if (tags.length !== uniqueIds.length) {
      throw new Error("One or more tags do not belong to this event");
    }
  }

  await prisma.$transaction([
    prisma.guestTagAssignment.deleteMany({ where: { guestId: guest.id } }),
    ...(uniqueIds.length > 0
      ? [
          prisma.guestTagAssignment.createMany({
            data: uniqueIds.map((tagId) => ({ guestId: guest.id, tagId })),
          }),
        ]
      : []),
  ]);

  const assigned = await prisma.guestTagAssignment.findMany({
    where: { guestId: guest.id },
    include: { tag: true },
    orderBy: { tag: { sortOrder: "asc" } },
  });
  return assigned.map((row) => toDto(row.tag));
}

/** Load tags for many guests in one query (CRM / seating). */
export async function mapGuestTags(
  guestIds: string[]
): Promise<Map<string, GuestTagDto[]>> {
  const map = new Map<string, GuestTagDto[]>();
  if (guestIds.length === 0) return map;

  const rows = await prisma.guestTagAssignment.findMany({
    where: { guestId: { in: guestIds }, tag: { archivedAt: null } },
    include: { tag: true },
    orderBy: { tag: { sortOrder: "asc" } },
  });

  for (const row of rows) {
    const list = map.get(row.guestId) ?? [];
    list.push(toDto(row.tag));
    map.set(row.guestId, list);
  }
  return map;
}
