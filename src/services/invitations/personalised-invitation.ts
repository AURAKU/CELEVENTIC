import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { mergeCompanionFeatureConfig } from "@/lib/admission/companion-studio";

/**
 * The primitives every personalised invitation is built from.
 *
 * Extracted so the bulk importer and the quick-create form mint *the same*
 * objects. If these ever diverged, a name typed into the quick form and the
 * same name pasted into a bulk import would produce invitations that behave
 * differently at the gate — which is exactly the class of bug that is
 * invisible until the event day.
 */

const SLUG_ATTEMPTS = 6;

/** Crypto-random invite link — the link is a bearer secret, not a slug. */
export function newUniqueLink(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Allocate a readable, unique slug for an invitation.
 *
 * The random suffix is not decoration: without it, two guests called Kofi
 * Mensah at different events would race for the same globally-unique slug.
 */
export async function allocateInvitationSlug(name: string): Promise<string> {
  const stem = slugify(name).slice(0, 60) || "invitation";
  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt++) {
    const candidate = `${stem}-${randomBytes(4).toString("hex")}`;
    const taken = await prisma.invitation.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${stem}-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
}

export interface InvitationFeatureOptions {
  /** Turn the Place Card feature on for this invitation. */
  enablePlaceCard: boolean;
  /** Issue a Guest Entry Pass (signed QR + admission code). */
  issueEntryPass: boolean;
  /**
   * Optional Event Companion studio config (usually from the event's
   * canonical invitation). Copied onto new links so already-configured
   * menu / programme / gift toggles apply without re-saving studio.
   */
  companionFeatureConfig?: unknown;
}

/**
 * Feature overrides stamped on a generated invitation.
 *
 * Written as explicit per-invitation overrides rather than event-level flips,
 * so creating one invitation can never change how an organiser's *existing*
 * invitations behave — except companion keys, which are intentionally
 * inherited from the event companion studio source when provided.
 */
export function featureConfigFor(
  options: InvitationFeatureOptions
): Prisma.InputJsonValue | undefined {
  let config: Record<string, unknown> = {};
  if (options.enablePlaceCard) config.PLACE_CARD = { enabled: true };
  if (options.issueEntryPass) {
    config.ENTRY_PASS = { enabled: true };
    config.MANUAL_ADMISSION_CODE = { enabled: true };
    config.PARTY_ADMISSION = { enabled: true };
  }
  if (options.companionFeatureConfig) {
    config = mergeCompanionFeatureConfig(
      config,
      options.companionFeatureConfig as Record<string, unknown>
    );
  }
  return Object.keys(config).length > 0 ? (config as Prisma.InputJsonValue) : undefined;
}

/** Pull the latest Event Companion studio keys for an event, if any. */
export async function loadEventCompanionFeatureConfig(eventId: string): Promise<{
  featureConfig: unknown;
  postAdmissionEnabled: boolean;
} | null> {
  const donor = await prisma.invitation.findFirst({
    where: { eventId },
    orderBy: [{ postAdmissionEnabled: "desc" }, { updatedAt: "desc" }],
    select: { featureConfig: true, postAdmissionEnabled: true },
  });
  if (!donor) return null;
  return {
    featureConfig: donor.featureConfig,
    postAdmissionEnabled: donor.postAdmissionEnabled,
  };
}

/**
 * Best-effort 4-digit gate code.
 *
 * Returns null instead of throwing when the space is exhausted on a very large
 * event: `GuestPass.code` auto-widens to six digits and covers manual
 * admission, so this is never worth failing an invitation over.
 */
export async function tryAllocateManualCode(eventId: string): Promise<string | null> {
  try {
    const { allocateManualAdmissionCode } = await import("@/lib/qr/manual-code");
    return await allocateManualAdmissionCode(eventId);
  } catch {
    return null;
  }
}

/** Give a guest a gate code if they do not have one. Never throws. */
export async function ensureGuestGateCode(guestId: string, eventId: string): Promise<string | null> {
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    select: { manualCode: true },
  });
  if (guest?.manualCode) return guest.manualCode;

  const code = await tryAllocateManualCode(eventId);
  if (!code) return null;

  try {
    await prisma.guest.update({ where: { id: guestId }, data: { manualCode: code } });
    return code;
  } catch {
    // Lost a unique race — the pass code still admits them.
    return null;
  }
}

/** Resolve, or lazily create, a named guest group for an event. */
export async function resolveGuestGroupId(
  tx: Prisma.TransactionClient,
  eventId: string,
  groupName: string | null
): Promise<string | null> {
  if (!groupName?.trim()) return null;
  const name = groupName.trim();
  const existing = await tx.guestGroup.findFirst({ where: { eventId, name }, select: { id: true } });
  if (existing) return existing.id;
  const created = await tx.guestGroup.create({ data: { eventId, name } });
  return created.id;
}
