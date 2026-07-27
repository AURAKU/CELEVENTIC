import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getServerAppUrl } from "@/lib/app-url";
import { cleanName, nameKey, stripTitles } from "@/lib/guest-import/name";
import { normalizeEmail, normalizeGhanaPhone } from "@/lib/guest-import/contact";
import { clampPartySize, suggestAllowance } from "@/lib/guest-search/party-allowance";
import type {
  DuplicateWarning,
  QuickInvitePreview,
  QuickInviteResult,
} from "@/lib/guest-search/types";
import { ensureInvitationPass, revokeInvitationPass } from "@/services/admission/guest-pass.service";
import {
  allocateInvitationSlug,
  ensureGuestGateCode,
  featureConfigFor,
  newUniqueLink,
} from "@/services/invitations/personalised-invitation";

/**
 * Quick Invitation Generator.
 *
 * One field is mandatory: the name. Everything a guest needs to be admitted —
 * a unique link, a signed QR pass, an event-scoped admission code, a place
 * card — is derived from it. Phone and email are delivery conveniences, not
 * prerequisites, because the most common way an invitation actually reaches a
 * Ghanaian guest is the host handing them a link in a WhatsApp chat that
 * already exists.
 *
 * The objects created here are the same objects the bulk importer creates,
 * via `@/services/invitations/personalised-invitation`. There is deliberately
 * no "quick invitation" type: at the gate, on the invite page and in
 * analytics, an invitation typed into this form is indistinguishable from one
 * imported from a spreadsheet.
 */

/**
 * Branded QR for a personal invite link.
 *
 * Encodes the invite URL rather than the signed pass token: the organiser is
 * printing something a guest will scan to *open their invitation*, and a
 * dashboard URL is a poor place for a bearer credential.
 */
export function buildQrImageUrl(appUrl: string, inviteUrl: string, eventId: string): string {
  const params = new URLSearchParams({
    data: inviteUrl,
    eventId,
    mode: "pass",
    size: "1024",
  });
  return `${appUrl}/api/qr/image?${params.toString()}`;
}

export class DuplicateGuestError extends Error {
  readonly duplicates: DuplicateWarning[];

  constructor(duplicates: DuplicateWarning[]) {
    super(
      duplicates[0]?.message ??
        "Someone with this name is already on the guest list."
    );
    this.name = "DuplicateGuestError";
    this.duplicates = duplicates;
  }
}

export interface QuickInviteInput {
  eventId: string;
  name: string;
  /** Heads to admit. Defaults to what the name implies. */
  partySize?: number;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  templateId?: string | null;
  message?: string | null;
  groupName?: string | null;
  /** Publish immediately so the link is live. Default true. */
  publishImmediately?: boolean;
  /** Issue a Guest Entry Pass. Default true. */
  issueEntryPass?: boolean;
  /** Enable the personalised place card. Default true. */
  enablePlaceCard?: boolean;
  /** Set by the form once the organiser has seen and dismissed the warning. */
  acknowledgeDuplicates?: boolean;
  actorUserId: string;
}

/**
 * The most distinctive word in a name, used to gather duplicate candidates.
 *
 * Matching on the whole typed string would miss the case that matters most:
 * "Mr Kofi Obuah" typed against a "Kofi Obuah" already on the list. Honorifics
 * are stripped and the longest remaining token — in practice the surname — is
 * what the database is asked for. Precision then comes from comparing
 * `nameKey`, which is order-, case-, accent- and title-insensitive.
 */
function duplicateProbe(name: string): string {
  const tokens = stripTitles(cleanName(name)).split(" ").filter(Boolean);
  if (tokens.length === 0) return cleanName(name);
  return tokens.reduce((longest, token) => (token.length > longest.length ? token : longest));
}

/** Look for anyone this new invitation might be a second copy of. */
async function findDuplicates(
  eventId: string,
  name: string,
  email: string | null,
  phone: string | null
): Promise<DuplicateWarning[]> {
  const key = nameKey(name);
  const phoneDigits = phone?.replace(/\D+/g, "") ?? null;
  const probe = duplicateProbe(name);

  const [guests, invitations] = await Promise.all([
    prisma.guest.findMany({
      where: {
        eventId,
        archivedAt: null,
        OR: [
          ...(email ? [{ email }] : []),
          ...(phoneDigits && phoneDigits.length >= 7
            ? [{ phone: { contains: phoneDigits.slice(-9) } }]
            : []),
          { name: { contains: probe } },
        ],
      },
      select: { id: true, name: true, email: true, phone: true },
      take: 50,
    }),
    prisma.invitation.findMany({
      where: { eventId, archivedAt: null, isGeneralPass: false, name: { contains: probe } },
      select: { id: true, name: true },
      take: 50,
    }),
  ]);

  const warnings: DuplicateWarning[] = [];

  for (const guest of guests) {
    if (email && guest.email?.toLowerCase() === email) {
      warnings.push({
        kind: "guest",
        id: guest.id,
        name: guest.name,
        message: `${guest.name} already uses ${email} on this event.`,
      });
      continue;
    }
    if (
      phoneDigits &&
      guest.phone &&
      guest.phone.replace(/\D+/g, "").slice(-9) === phoneDigits.slice(-9)
    ) {
      warnings.push({
        kind: "guest",
        id: guest.id,
        name: guest.name,
        message: `${guest.name} already uses this phone number on this event.`,
      });
      continue;
    }
    // Name alone is a question, not a fact — two cousins really can share one.
    if (key && nameKey(guest.name) === key) {
      warnings.push({
        kind: "guest",
        id: guest.id,
        name: guest.name,
        message: `"${guest.name}" is already on this event's guest list.`,
      });
    }
  }

  const seenGuestNames = new Set(warnings.map((w) => nameKey(w.name)));
  for (const invitation of invitations) {
    if (!key || nameKey(invitation.name) !== key) continue;
    if (seenGuestNames.has(nameKey(invitation.name))) continue;
    warnings.push({
      kind: "invitation",
      id: invitation.id,
      name: invitation.name,
      message: `An invitation named "${invitation.name}" already exists for this event.`,
    });
  }

  return warnings;
}

/**
 * Dry run: what would be created, and what should the organiser look at first.
 *
 * Writes nothing. Safe to call on every pause in typing.
 */
export async function previewQuickInvitation(input: {
  eventId: string;
  name: string;
  partySize?: number;
  phone?: string | null;
  email?: string | null;
}): Promise<QuickInvitePreview> {
  const displayName = cleanName(input.name);
  const suggestion = suggestAllowance(displayName);
  const partySize =
    input.partySize != null ? clampPartySize(input.partySize) : suggestion.partySize;

  const phoneResult = normalizeGhanaPhone(input.phone);
  const emailResult = normalizeEmail(input.email);

  const duplicates = displayName
    ? await findDuplicates(input.eventId, displayName, emailResult.value, phoneResult.value)
    : [];

  return {
    displayName,
    partyType: suggestion.partyType,
    partySize,
    allowanceConfirmed: suggestion.confirmed,
    memberNames: suggestion.memberNames,
    hint: suggestion.hint,
    normalizedPhone: phoneResult.normalized ? phoneResult.value : null,
    phoneWarning: phoneResult.invalid
      ? "That does not look like a reachable phone number — it will be saved as typed."
      : null,
    emailWarning: emailResult.invalid
      ? "That email address looks wrong, so it will not be saved."
      : null,
    duplicates,
  };
}

/**
 * Create one personalised invitation.
 *
 * The invitation, its guest row and its group are written in a single
 * transaction; the pass and gate code are issued after it commits. That split
 * is deliberate — pass issuance runs its own transaction and allocates a
 * globally-scarce code, so holding the invitation transaction open across it
 * would serialise every concurrent create on the event.
 */
export async function createQuickInvitation(
  input: QuickInviteInput
): Promise<QuickInviteResult> {
  const displayName = cleanName(input.name);
  if (displayName.length < 2) {
    throw new Error("Enter the guest or invitation name.");
  }

  const suggestion = suggestAllowance(displayName);
  const partySize =
    input.partySize != null ? clampPartySize(input.partySize) : suggestion.partySize;

  const phoneResult = normalizeGhanaPhone(input.phone);
  const emailResult = normalizeEmail(input.email);
  const email = emailResult.value;
  const phone = phoneResult.value;

  if (!input.acknowledgeDuplicates) {
    const duplicates = await findDuplicates(input.eventId, displayName, email, phone);
    if (duplicates.length > 0) throw new DuplicateGuestError(duplicates);
  }

  const issueEntryPass = input.issueEntryPass ?? true;
  const enablePlaceCard = input.enablePlaceCard ?? true;
  const publish = input.publishImmediately ?? true;

  const slug = await allocateInvitationSlug(displayName);

  const created = await prisma.$transaction(async (tx) => {
    const invitation = await tx.invitation.create({
      data: {
        eventId: input.eventId,
        name: displayName,
        slug,
        uniqueLink: newUniqueLink(),
        templateId: input.templateId || undefined,
        message: input.message || undefined,
        status: publish ? "ACTIVE" : "DRAFT",
        admissionAllowance: partySize,
        featureConfig: featureConfigFor({ enablePlaceCard, issueEntryPass }),
      },
      select: { id: true, uniqueLink: true, status: true },
    });

    let groupId: string | null = null;
    if (input.groupName?.trim()) {
      const name = input.groupName.trim();
      const existing = await tx.guestGroup.findFirst({
        where: { eventId: input.eventId, name },
        select: { id: true },
      });
      groupId = existing?.id ?? (await tx.guestGroup.create({ data: { eventId: input.eventId, name } })).id;
    }

    // Named members become real guest rows so the scanner can tick people off
    // individually; the remainder rides as plus-ones on the primary guest.
    const namedMembers = suggestion.memberNames.slice(0, Math.max(0, partySize - 1));
    const plusOnes = Math.max(0, partySize - 1 - namedMembers.length);

    const primary = await tx.guest.create({
      data: {
        eventId: input.eventId,
        invitationId: invitation.id,
        groupId,
        name: displayName,
        email,
        phone,
        notes: input.notes?.trim() || null,
        plusOnes,
        status: "INVITED",
        partyType: suggestion.partyType,
      },
      select: { id: true, qrToken: true },
    });

    for (const member of namedMembers) {
      if (nameKey(member) === nameKey(displayName)) continue;
      await tx.guest.create({
        data: {
          eventId: input.eventId,
          invitationId: invitation.id,
          groupId,
          name: member,
          plusOnes: 0,
          status: "INVITED",
          partyType: suggestion.partyType,
        },
      });
    }

    return { invitation, guestId: primary.id, qrToken: primary.qrToken };
  });

  const manualCode = await ensureGuestGateCode(created.guestId, input.eventId);

  let admissionCode: string | null = null;
  if (issueEntryPass) {
    const issued = await ensureInvitationPass(created.invitation.id);
    admissionCode = issued?.pass.code ?? null;
  }

  await createAuditLog({
    userId: input.actorUserId,
    action: "CREATE",
    entity: "invitation",
    entityId: created.invitation.id,
    details: {
      kind: "quick_invitation_created",
      eventId: input.eventId,
      partySize,
      partyType: suggestion.partyType,
      hasEmail: Boolean(email),
      hasPhone: Boolean(phone),
      entryPass: issueEntryPass,
    },
  });

  // Prefer request host so live Hostinger never mints localhost share links
  // even if NEXT_PUBLIC_APP_URL was left pointing at a local tunnel.
  const appUrl = await getServerAppUrl();
  const invitePath = `/invite/${created.invitation.uniqueLink}?guest=${created.qrToken}`;
  const inviteUrl = `${appUrl}${invitePath}`;

  return {
    invitationId: created.invitation.id,
    guestId: created.guestId,
    name: displayName,
    partySize,
    partyType: suggestion.partyType,
    status: created.invitation.status,
    inviteUrl,
    invitePath,
    admissionCode,
    manualCode,
    qrImageUrl: buildQrImageUrl(appUrl, inviteUrl, input.eventId),
    placeCardEnabled: enablePlaceCard,
    entryPassEnabled: issueEntryPass,
  };
}

export interface PersonalisationUpdate {
  eventId: string;
  invitationId: string;
  name?: string;
  partySize?: number;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  actorUserId: string;
}

/**
 * Edit a published invitation in place.
 *
 * `uniqueLink` and `slug` are never touched, so a link already sitting in a
 * guest's WhatsApp history keeps working after the host fixes a spelling or
 * widens the party. Widening also refreshes the pass allowance, because a
 * plus-one added after issuance must not meet a pass that is already full.
 */
export async function updateInvitationPersonalisation(
  update: PersonalisationUpdate
): Promise<void> {
  const invitation = await prisma.invitation.findFirst({
    where: { id: update.invitationId, eventId: update.eventId },
    select: {
      id: true,
      admissionAllowance: true,
      guests: { orderBy: { createdAt: "asc" }, take: 1, select: { id: true } },
    },
  });
  if (!invitation) throw new Error("Invitation not found");

  const data: Prisma.InvitationUpdateInput = {};
  let displayName: string | null = null;

  if (update.name != null) {
    displayName = cleanName(update.name);
    if (displayName.length < 2) throw new Error("Enter the guest or invitation name.");
    data.name = displayName;
  }

  const partySize = update.partySize != null ? clampPartySize(update.partySize) : null;
  if (partySize != null) data.admissionAllowance = partySize;

  if (Object.keys(data).length > 0) {
    await prisma.invitation.update({ where: { id: invitation.id }, data });
  }

  const primaryGuestId = invitation.guests[0]?.id;
  if (primaryGuestId) {
    const guestData: Prisma.GuestUpdateInput = {};
    if (displayName) guestData.name = displayName;
    if (update.email !== undefined) guestData.email = normalizeEmail(update.email).value;
    if (update.phone !== undefined) guestData.phone = normalizeGhanaPhone(update.phone).value;
    if (update.notes !== undefined) guestData.notes = update.notes?.trim() || null;
    if (partySize != null) {
      const others = await prisma.guest.count({
        where: { invitationId: invitation.id, id: { not: primaryGuestId }, archivedAt: null },
      });
      guestData.plusOnes = Math.max(0, partySize - 1 - others);
    }
    if (Object.keys(guestData).length > 0) {
      await prisma.guest.update({ where: { id: primaryGuestId }, data: guestData });
    }
  }

  // Keeps the printed name and the allowance on the pass in step with the
  // invitation, without minting a new QR the guest would have to be re-sent.
  await ensureInvitationPass(invitation.id, { refreshPartySize: true });

  if (displayName) {
    await prisma.guestPass.updateMany({
      where: { invitationId: invitation.id, status: { notIn: ["REVOKED", "REISSUED"] } },
      data: { displayName },
    });
  }

  await createAuditLog({
    userId: update.actorUserId,
    action: "UPDATE",
    entity: "invitation",
    entityId: invitation.id,
    details: {
      kind: "invitation_personalisation_updated",
      eventId: update.eventId,
      fields: Object.keys({ ...data, ...(update.email !== undefined ? { email: 1 } : {}) }),
    },
  });
}

export type InvitationLifecycleAction = "ARCHIVE" | "RESTORE" | "REVOKE_PASS" | "REISSUE_PASS";

/**
 * Archive, restore, revoke or reissue.
 *
 * Archive is always available and always reversible; it hides the invitation
 * and revokes the pass so an old printout is politely refused at the gate
 * rather than reading as an unknown QR. There is no delete: an invitation that
 * has already been handed out cannot be made never to have existed.
 */
export async function setInvitationLifecycle(params: {
  eventId: string;
  invitationId: string;
  action: InvitationLifecycleAction;
  reason?: string;
  actorUserId: string;
}): Promise<void> {
  const invitation = await prisma.invitation.findFirst({
    where: { id: params.invitationId, eventId: params.eventId },
    select: { id: true },
  });
  if (!invitation) throw new Error("Invitation not found");

  const reason = params.reason?.trim() || "Organiser action";

  switch (params.action) {
    case "ARCHIVE":
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { archivedAt: new Date() },
      });
      await prisma.guest.updateMany({
        where: { invitationId: invitation.id },
        data: { archivedAt: new Date() },
      });
      await revokeInvitationPass(invitation.id, params.actorUserId, `Archived: ${reason}`);
      break;

    case "RESTORE": {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { archivedAt: null },
      });
      await prisma.guest.updateMany({
        where: { invitationId: invitation.id },
        data: { archivedAt: null },
      });
      // Reissue rather than ensure: archiving revoked the pass, and a revoked
      // pass is not reactivated — it stays on record so the QR already in a
      // guest's phone is recognised and refused, while they receive a new one.
      const { regenerateInvitationPass } = await import("@/services/admission/guest-pass.service");
      await regenerateInvitationPass(invitation.id, params.actorUserId, `Restored: ${reason}`);
      break;
    }

    case "REVOKE_PASS":
      await revokeInvitationPass(invitation.id, params.actorUserId, reason);
      break;

    case "REISSUE_PASS": {
      const { regenerateInvitationPass } = await import("@/services/admission/guest-pass.service");
      await regenerateInvitationPass(invitation.id, params.actorUserId, reason);
      break;
    }
  }

  await createAuditLog({
    userId: params.actorUserId,
    action: "UPDATE",
    entity: "invitation",
    entityId: invitation.id,
    details: {
      kind: "invitation_lifecycle",
      eventId: params.eventId,
      action: params.action,
      reason,
    },
  });
}