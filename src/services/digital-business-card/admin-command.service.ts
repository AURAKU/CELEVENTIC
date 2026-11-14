import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { getCeleYouShareOrigin } from "@/lib/app-url";
import { parsePaginationInput, paginatedResult, ADMIN_TABLE_LIMIT } from "@/lib/pagination";
import { Permission } from "@/lib/rbac/types";
import { hasPermission } from "@/lib/rbac/permissions";
import { communicationService } from "@/services/communications/communication.service";
import {
  createDigitalCard,
  propagateAccountEntitlement,
  recordCeleCardLifecycleEvent,
} from "@/services/digital-business-card/digital-business-card.service";
import { getCeleCardLifecyclePolicy } from "@/services/digital-business-card/lifecycle-policy.service";
import {
  resolveCeleCardLifecycle,
  celeCardPublicPresentation,
  renewalBaseDate,
  isCeleCardFullyPublic,
  type CeleCardLifecyclePolicy,
} from "@/lib/digital-business-card/lifecycle";
import { celeYouBillingPhase, celeYouDirectoryExpiryRange } from "@/lib/digital-business-card/billing-rules";
import { listCeleYouPaymentsForCard } from "@/services/digital-business-card/smartcard-billing.service";
import { DIGITAL_CARD_THEMES, resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import { getSmartCardPlan, smartCardExpiryFromNow } from "@/lib/digital-business-card/plans";
import { getCeleCardCatalog } from "@/services/digital-business-card/catalog.service";
import { clipCeleCardBio, digitalCardPublicUrl } from "@/lib/digital-business-card/types";
import { celeCardStableQrUrl, digitalCardExportImagePath } from "@/lib/digital-business-card/share";
import { digitalCardQrImageSrc } from "@/lib/digital-business-card/types";
import { celeYouPrintQrPngSrc, celeYouPrintQrSvgSrc } from "@/lib/digital-business-card/share-channels";
import { nfcActionFromAdminAction } from "@/lib/digital-business-card/nfc-device";
import { applyNfcDeviceMutation, listNfcDevicesForCard } from "@/services/digital-business-card/nfc-device.service";
import {
  canGrantComplimentary,
  canPerformCeleCardAction,
  CELECARD_ACTION_PERMISSION,
  type CeleCardAdminAction,
} from "@/lib/digital-business-card/admin-permissions";
import {
  CELECARD_CLAIM_TTL_MS,
  CELECARD_UNCLAIMED_HOLDER_EMAIL,
  claimInviteIsUsable,
  emailsMatchForClaim,
  hashCeleCardClaimToken,
  isUnclaimedHolderEmail,
  newCeleCardClaimToken,
  normalizeClaimEmail,
} from "@/lib/digital-business-card/claim-token";
import type { UserRole } from "@prisma/client";
import type { Prisma } from "@prisma/client";

export class CeleCardAdminError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code?: string
  ) {
    super(message);
    this.name = "CeleCardAdminError";
  }
}

type AdminActor = { id: string; role: UserRole };

const DIRECTORY_SELECT = {
  id: true,
  userId: true,
  slug: true,
  publicToken: true,
  displayName: true,
  title: true,
  company: true,
  email: true,
  phone: true,
  themeId: true,
  isPublished: true,
  subscriptionStatus: true,
  subscriptionExpiresAt: true,
  adminSuspendedAt: true,
  adminDeactivatedAt: true,
  entitlementKind: true,
  deletedAt: true,
  lastActivatedAt: true,
  unclaimedEmail: true,
  unclaimedPhone: true,
  claimedAt: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, email: true, phone: true, status: true, role: true } },
} as const;

export type AssistedCreateInput = {
  ownerUserId?: string | null;
  unclaimedEmail?: string | null;
  unclaimedPhone?: string | null;
  displayName: string;
  title?: string | null;
  company?: string | null;
  bio?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  socials?: Record<string, unknown>;
  avatarUrl?: string | null;
  themeId?: string | null;
  connectBackEnabled?: boolean;
  isPublished?: boolean;
  activation:
    | { kind: "draft" }
    | { kind: "payment" }
    | {
        kind: "complimentary" | "promotional" | "manual";
        planId: string;
        reason: string;
        months?: number;
        approvalRef?: string | null;
      };
};

function actorCtx(actor: AdminActor) {
  return { role: actor.role };
}

function requireAction(actor: AdminActor, action: CeleCardAdminAction) {
  if (!canPerformCeleCardAction(actorCtx(actor), action)) {
    throw new CeleCardAdminError("You do not have permission for this CeleYou action.", 403, "forbidden");
  }
}

function requireReason(reason?: string | null, label = "reason") {
  const value = (reason ?? "").trim();
  if (value.length < 8) {
    throw new CeleCardAdminError(`A ${label} of at least 8 characters is required.`, 400, "reason_required");
  }
  return value;
}

async function audit(input: {
  actor: AdminActor;
  action: "CREATE" | "UPDATE" | "SUSPEND" | "REACTIVATE";
  cardId: string;
  customerId?: string | null;
  kind: string;
  previous?: Record<string, unknown>;
  next?: Record<string, unknown>;
  reason?: string | null;
  correlationId?: string | null;
}) {
  await createAuditLog({
    userId: input.actor.id,
    action: input.action,
    entity: "celecard",
    entityId: input.cardId,
    details: {
      kind: input.kind,
      targetCustomerId: input.customerId ?? null,
      previous: input.previous ?? null,
      next: input.next ?? null,
      reason: input.reason ?? null,
      correlationId: input.correlationId ?? null,
    },
  });
}

export async function getUnclaimedHolderUserId(): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { email: CELECARD_UNCLAIMED_HOLDER_EMAIL },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.user.create({
    data: {
      email: CELECARD_UNCLAIMED_HOLDER_EMAIL,
      name: "CeleYou Unclaimed Holder",
      role: "GUEST",
      status: "SUSPENDED",
      passwordHash: null,
      isVerified: false,
    },
    select: { id: true },
  });
  return created.id;
}

function directoryRestrictions(card: {
  adminSuspendedAt: Date | null;
  adminDeactivatedAt?: Date | null;
  deletedAt: Date | null;
  claimedAt?: Date | null;
  unclaimedEmail?: string | null;
}) {
  const items: string[] = [];
  if (card.deletedAt) items.push("deleted");
  if (card.adminSuspendedAt) items.push("suspended");
  if (card.adminDeactivatedAt) items.push("deactivated");
  if (!card.claimedAt && card.unclaimedEmail) items.push("unclaimed");
  return items;
}

function serializeDirectoryCard(
  card: {
    id: string;
    userId: string;
    slug: string;
    publicToken: string;
    displayName: string;
    title: string | null;
    company: string | null;
    email: string | null;
    phone: string | null;
    themeId: string;
    isPublished: boolean;
    subscriptionStatus: string;
    subscriptionExpiresAt: Date | null;
    adminSuspendedAt: Date | null;
    adminDeactivatedAt?: Date | null;
    entitlementKind?: string | null;
    deletedAt: Date | null;
    lastActivatedAt: Date | null;
    unclaimedEmail?: string | null;
    unclaimedPhone?: string | null;
    claimedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    user?: { id: string; name: string; email: string | null; phone: string | null; status: string; role: string } | null;
  },
  origin: string,
  policy: CeleCardLifecyclePolicy
) {
  const unclaimed = !card.claimedAt && Boolean(card.unclaimedEmail);
  const holder = isUnclaimedHolderEmail(card.user?.email);
  const cardholderName = unclaimed || holder ? card.displayName : card.user?.name || card.displayName;
  const contact = unclaimed
    ? card.unclaimedEmail
    : holder
      ? card.unclaimedEmail || card.email
      : card.user?.email || card.email;
  const lifecycle = resolveCeleCardLifecycle(card, new Date(), policy);
  const presentation = celeCardPublicPresentation(card, new Date(), policy);
  return {
    id: card.id,
    cardholderName,
    email: contact || null,
    cardId: card.id,
    slug: card.slug,
    publicProfileUrl: digitalCardPublicUrl(card.slug, origin),
    canonicalUrl: celeCardStableQrUrl(card.publicToken, origin),
    qrImageSrc: digitalCardQrImageSrc(celeCardStableQrUrl(card.publicToken, origin), { size: 512, variant: "guide" }),
    cardImageSrc: digitalCardExportImagePath(card.slug),
    subscriptionPlan: card.entitlementKind || card.subscriptionStatus,
    subscriptionStatus: card.subscriptionStatus,
    activationStatus: card.adminDeactivatedAt ? "deactivated" : presentation,
    publicationStatus: card.isPublished ? "published" : "unpublished",
    expirationDate: card.subscriptionExpiresAt?.toISOString() ?? null,
    creationDate: card.createdAt.toISOString(),
    lastUpdatedDate: card.updatedAt.toISOString(),
    administrativeRestrictions: directoryRestrictions(card),
    lifecycle,
    billingPhase: celeYouBillingPhase(lifecycle),
    presentation,
    themeId: card.themeId,
    unclaimed,
    claimedAt: card.claimedAt?.toISOString() ?? null,
  };
}

export async function listCeleCardAdminDirectory(input: {
  search?: string | null;
  status?: string | null;
  sort?: string | null;
  page?: number | string | null;
  limit?: number | string | null;
}) {
  const { page, limit, skip } = parsePaginationInput(
    { page: input.page, limit: input.limit },
    { limit: ADMIN_TABLE_LIMIT }
  );
  const q = (input.search ?? "").trim();
  const status = (input.status ?? "").trim().toLowerCase();
  const now = new Date();
  const policy = await getCeleCardLifecyclePolicy();
  const where: Prisma.DigitalBusinessCardWhereInput = {};
  if (status !== "deleted") {
    where.deletedAt = null;
  }
  if (q) {
    where.OR = [
      { displayName: { contains: q } },
      { email: { contains: q } },
      { slug: { contains: q } },
      { unclaimedEmail: { contains: q } },
      { user: { email: { contains: q } } },
      { user: { name: { contains: q } } },
    ];
  }
  if (status === "suspended") where.adminSuspendedAt = { not: null };
  else if (status === "deactivated") where.adminDeactivatedAt = { not: null };
  else if (status === "unclaimed") {
    where.claimedAt = null;
    where.unclaimedEmail = { not: null };
  } else if (status === "draft") where.subscriptionStatus = "TRIAL";
  else if (status === "active") {
    where.subscriptionStatus = "ACTIVE";
    where.isPublished = true;
    where.adminSuspendedAt = null;
    where.adminDeactivatedAt = null;
    where.subscriptionExpiresAt = celeYouDirectoryExpiryRange("active", now, policy);
  } else if (status === "grace") {
    where.subscriptionStatus = "EXPIRED";
    where.isPublished = true;
    where.subscriptionExpiresAt = celeYouDirectoryExpiryRange("grace", now, policy);
  } else if (status === "courtesy" || status === "expired") {
    where.subscriptionStatus = "EXPIRED";
    where.subscriptionExpiresAt = celeYouDirectoryExpiryRange("courtesy", now, policy);
  } else if (status === "expiring" || status === "renewal_due") {
    where.subscriptionStatus = "ACTIVE";
    where.subscriptionExpiresAt = celeYouDirectoryExpiryRange("expiring", now, policy);
  } else if (status === "deleted") where.deletedAt = { not: null };

  const sort = (input.sort ?? "createdAt:desc").toLowerCase();
  const [sortField, sortDir] = sort.split(":");
  const dir = sortDir === "asc" ? "asc" : "desc";
  const orderBy: Prisma.DigitalBusinessCardOrderByWithRelationInput =
    sortField === "displayName"
      ? { displayName: dir }
      : sortField === "updatedAt"
        ? { updatedAt: dir }
        : sortField === "expiration" || sortField === "subscriptionexpiresat"
          ? { subscriptionExpiresAt: dir }
          : { createdAt: dir };

  const [rows, total] = await Promise.all([
    prisma.digitalBusinessCard.findMany({
      where,
      select: DIRECTORY_SELECT,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.digitalBusinessCard.count({ where }),
  ]);
  const origin = getCeleYouShareOrigin();
  return paginatedResult(
    rows.map((row) => serializeDirectoryCard(row, origin, policy)),
    total,
    page,
    limit
  );
}

export async function getCeleCardCommandOverview() {
  const policy = await getCeleCardLifecyclePolicy();
  const catalog = await getCeleCardCatalog();
  const now = new Date();
  const expiringUntil = new Date(now.getTime() + policy.expiringSoonDays * 86_400_000);
  const [
    total,
    suspended,
    deactivated,
    unclaimed,
    activeSubscriptions,
    expiringSoon,
    pendingConnections,
    courtesyReconnects,
    conciergeOpen,
    cards,
    publishedCards,
    engagementRows,
  ] = await Promise.all([
    prisma.digitalBusinessCard.count({ where: { deletedAt: null } }),
    prisma.digitalBusinessCard.count({ where: { deletedAt: null, adminSuspendedAt: { not: null } } }),
    prisma.digitalBusinessCard.count({ where: { deletedAt: null, adminDeactivatedAt: { not: null } } }),
    prisma.digitalBusinessCard.count({
      where: { deletedAt: null, claimedAt: null, unclaimedEmail: { not: null } },
    }),
    prisma.digitalBusinessCard.count({
      where: { deletedAt: null, subscriptionStatus: "ACTIVE", subscriptionExpiresAt: { gt: now } },
    }),
    prisma.digitalBusinessCard.count({
      where: {
        deletedAt: null,
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: { gt: now, lte: expiringUntil },
      },
    }),
    prisma.smartCardConnection.count({ where: { status: "NEW" } }),
    prisma.smartCardConnection.count({ where: { source: "courtesy_reconnect" } }),
    prisma.smartCardConciergeOrder
      .count({ where: { status: { in: ["INTAKE", "AWAITING_PAYMENT", "PAID", "IN_PROGRESS", "READY"] } } })
      .catch(() => 0),
    prisma.digitalBusinessCard.findMany({
      where: { deletedAt: null },
      select: {
        isPublished: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        adminSuspendedAt: true,
        adminDeactivatedAt: true,
        deletedAt: true,
        lastActivatedAt: true,
      },
      take: 2000,
    }),
    prisma.digitalBusinessCard.count({
      where: { deletedAt: null, isPublished: true, adminSuspendedAt: null },
    }),
    prisma.smartCardInteraction.groupBy({
      by: ["kind"],
      where: { createdAt: { gte: new Date(now.getTime() - 30 * 86_400_000) } },
      _count: { _all: true },
    }),
  ]);
  const totals: Record<string, number> = {
    DRAFT: 0,
    ACTIVE: 0,
    EXPIRING: 0,
    GRACE_PERIOD: 0,
    COURTESY: 0,
    SUSPENDED: 0,
    DELETED: 0,
  };
  let live = 0;
  let courtesy = 0;
  for (const card of cards) {
    const state = resolveCeleCardLifecycle(card, now, policy);
    totals[state] = (totals[state] ?? 0) + 1;
    const presentation = celeCardPublicPresentation(card, now, policy);
    if (presentation === "live") live += 1;
    if (presentation === "courtesy") courtesy += 1;
  }
  return {
    total,
    activeCards: live,
    courtesyModeCards: courtesy,
    suspendedCards: suspended,
    deactivatedCards: deactivated,
    unclaimedCards: unclaimed,
    activeSubscriptions,
    expiringSoon,
    pendingConnectionRequests: pendingConnections,
    conciergeOpen,
    courtesyReconnects,
    totals,
    publishedCards,
    engagement: (() => {
      const byKind: Record<string, number> = {};
      for (const row of engagementRows) byKind[row.kind] = row._count._all;
      return {
        windowDays: 30,
        profileOpens: byKind.profile_open ?? 0,
        qrOpens: byKind.qr_open ?? 0,
        nfcTaps: byKind.nfc_tap ?? 0,
        contactDownloads: byKind.vcard_download ?? 0,
        contactTaps: byKind.vcard_save ?? 0,
        paymentOpens: byKind.payment_open ?? 0,
        shares: byKind.share_tap ?? 0,
      };
    })(),
    prepaidNote: "CeleYou Pro plans are prepaid terms, not contractual monthly recurring revenue. Concierge design is a separate one-time fee.",
    plans: catalog.plans.map((plan) => ({
      id: plan.id,
      label: plan.label,
      months: plan.months,
      priceGhs: plan.priceGhs,
    })),
    conciergePriceGhs: catalog.conciergePriceGhs,
  };
}

export async function searchAdminUsers(input: {
  search?: string | null;
  page?: number | string | null;
  limit?: number | string | null;
}) {
  const { page, limit, skip } = parsePaginationInput(
    { page: input.page, limit: input.limit },
    { limit: 10, maxLimit: 25 }
  );
  const q = (input.search ?? "").trim();
  if (q.length < 2) {
    return paginatedResult([], 0, page, limit);
  }
  const where: Prisma.UserWhereInput = {
    AND: [
      { email: { not: CELECARD_UNCLAIMED_HOLDER_EMAIL } },
      { status: { not: "SUSPENDED" } },
      {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
        ],
      },
    ],
  };
  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);
  return paginatedResult(rows, total, page, limit);
}

export function listAdminTemplates() {
  return DIGITAL_CARD_THEMES.map((theme) => ({
    id: theme.id,
    name: theme.name,
    tagline: theme.tagline,
    category: theme.category,
    previewLabel: theme.previewLabel,
    accent: theme.accent,
    cardBackground: theme.cardBackground,
  }));
}

async function issueClaimInvite(input: {
  cardId: string;
  email: string;
  phone?: string | null;
  actor: AdminActor;
}) {
  const email = normalizeClaimEmail(input.email);
  if (!email || !email.includes("@")) {
    throw new CeleCardAdminError("A valid invitation email is required.", 400);
  }
  const { token, tokenHash } = newCeleCardClaimToken();
  const expiresAt = new Date(Date.now() + CELECARD_CLAIM_TTL_MS);
  await prisma.smartCardClaimInvite.create({
    data: {
      cardId: input.cardId,
      tokenHash,
      email,
      phone: input.phone?.trim() || null,
      expiresAt,
      createdByUserId: input.actor.id,
    },
  });
  const origin = getCeleYouShareOrigin();
  return {
    token,
    claimUrl: `${origin.replace(/\/$/, "")}/card/claim/${encodeURIComponent(token)}`,
    expiresAt: expiresAt.toISOString(),
    email,
  };
}

export async function createAssistedCeleCard(actor: AdminActor, input: AssistedCreateInput) {
  if (!hasPermission(actorCtx(actor), Permission.CELECARD_CREATE)) {
    throw new CeleCardAdminError("You do not have permission to create a CeleYou.", 403, "forbidden");
  }
  const displayName = input.displayName.trim();
  if (displayName.length < 2) throw new CeleCardAdminError("Full name is required.");
  const ownerUserId = input.ownerUserId?.trim() || null;
  const unclaimedEmail = normalizeClaimEmail(input.unclaimedEmail);
  if (!ownerUserId && !unclaimedEmail) {
    throw new CeleCardAdminError("Select an existing customer or provide an invitation email.");
  }

  let userId = ownerUserId;
  let claimedAt: Date | null = new Date();
  if (ownerUserId) {
    const owner = await prisma.user.findUnique({
      where: { id: ownerUserId },
      select: { id: true, email: true, status: true },
    });
    if (!owner || owner.status === "SUSPENDED" || isUnclaimedHolderEmail(owner.email)) {
      throw new CeleCardAdminError("That customer cannot receive a CeleYou.", 400);
    }
  } else {
    userId = await getUnclaimedHolderUserId();
    claimedAt = null;
  }

  const created = await createDigitalCard(userId!, {
    displayName,
    title: input.title,
    company: input.company,
    bio: input.bio,
    email: input.email || unclaimedEmail || null,
    phone: input.phone || input.unclaimedPhone || null,
    website: input.website,
    socials: (input.socials ?? {}) as never,
    themeId: resolveDigitalCardTheme(input.themeId).id,
    avatarUrl: input.avatarUrl,
    isPublished: input.activation.kind === "draft" ? false : Boolean(input.isPublished ?? false),
  });

  const extra: Prisma.DigitalBusinessCardUpdateInput = {
    connectBackEnabled: input.connectBackEnabled !== false,
    unclaimedEmail: claimedAt ? null : unclaimedEmail,
    unclaimedPhone: claimedAt ? null : input.unclaimedPhone?.trim() || null,
    claimedAt,
  };
  const patched = await prisma.digitalBusinessCard.update({
    where: { id: created.id },
    data: extra,
  });

  let claim: { token: string; claimUrl: string; expiresAt: string; email: string } | null = null;
  if (!claimedAt && unclaimedEmail) {
    claim = await issueClaimInvite({
      cardId: patched.id,
      email: unclaimedEmail,
      phone: input.unclaimedPhone,
      actor,
    });
    await recordCeleCardLifecycleEvent({ cardId: patched.id, kind: "CardUnclaimedCreated" });
  }

  if (input.activation.kind !== "draft" && input.activation.kind !== "payment") {
    await grantManualEntitlement(actor, {
      cardId: patched.id,
      kind: input.activation.kind,
      planId: input.activation.planId,
      reason: input.activation.reason,
      months: input.activation.months,
      approvalRef: input.activation.approvalRef,
    });
  }

  await audit({
    actor,
    action: "CREATE",
    cardId: patched.id,
    customerId: claimedAt ? userId : null,
    kind: claimedAt ? "assisted_create" : "unclaimed_create",
    next: { slug: patched.slug, activation: input.activation.kind },
  });

  const origin = getCeleYouShareOrigin();
  const policy = await getCeleCardLifecyclePolicy();
  return {
    card: serializeDirectoryCard({ ...patched, user: null }, origin, policy),
    claimUrl: claim?.claimUrl ?? null,
    claimExpiresAt: claim?.expiresAt ?? null,
  };
}

export async function grantManualEntitlement(
  actor: AdminActor,
  input: {
    cardId: string;
    kind: "complimentary" | "promotional" | "manual" | "extension";
    planId: string;
    reason: string;
    months?: number | null;
    approvalRef?: string | null;
    correlationId?: string | null;
  }
) {
  const action: CeleCardAdminAction =
    input.kind === "extension" ? "extend" : input.kind === "manual" ? "manual" : input.kind;
  requireAction(actor, action);
  if (
    (input.kind === "complimentary" || input.kind === "promotional" || input.kind === "manual") &&
    !canGrantComplimentary(actorCtx(actor))
  ) {
    throw new CeleCardAdminError("Complimentary entitlements require a platform admin.", 403, "complimentary_forbidden");
  }
  const reason = requireReason(input.reason);
  const plan = getSmartCardPlan(input.planId);
  if (!plan) throw new CeleCardAdminError("Unknown plan.");
  const card = await prisma.digitalBusinessCard.findUnique({ where: { id: input.cardId } });
  if (!card || card.deletedAt) throw new CeleCardAdminError("Card not found.", 404);
  if (card.adminSuspendedAt) {
    throw new CeleCardAdminError("Suspended cards cannot receive a public entitlement until unsuspended.", 409);
  }
  const months = input.months && input.months > 0 ? input.months : plan.months;
  const startsAt = renewalBaseDate(card, new Date(), await getCeleCardLifecyclePolicy());
  const expiresAt = smartCardExpiryFromNow(months, startsAt);
  const previous = {
    subscriptionStatus: card.subscriptionStatus,
    subscriptionExpiresAt: card.subscriptionExpiresAt?.toISOString() ?? null,
    entitlementKind: card.entitlementKind ?? null,
  };
  const updated = await prisma.digitalBusinessCard.update({
    where: { id: card.id },
    data: {
      subscriptionStatus: "ACTIVE",
      subscriptionExpiresAt: expiresAt,
      isPublished: true,
      lastActivatedAt: new Date(),
      lastCourtesyAt: null,
      entitlementKind: input.kind.toUpperCase(),
      adminDeactivatedAt: null,
    },
  });
  await propagateAccountEntitlement(updated);
  await prisma.smartCardEntitlementGrant.create({
    data: {
      cardId: card.id,
      kind: input.kind.toUpperCase(),
      planId: plan.id,
      months,
      startsAt,
      expiresAt,
      reason,
      grantedByUserId: actor.id,
      approvalRef: input.approvalRef?.trim() || null,
    },
  });
  await recordCeleCardLifecycleEvent({
    cardId: card.id,
    kind: "EntitlementGranted",
    meta: { kind: input.kind, planId: plan.id, months, paymentId: null },
  });
  await audit({
    actor,
    action: "UPDATE",
    cardId: card.id,
    customerId: card.userId,
    kind: `entitlement_${input.kind}`,
    previous,
    next: {
      subscriptionStatus: updated.subscriptionStatus,
      subscriptionExpiresAt: updated.subscriptionExpiresAt?.toISOString() ?? null,
      entitlementKind: updated.entitlementKind,
    },
    reason,
    correlationId: input.correlationId,
  });
  return updated;
}

export async function applyCeleCardAdminAction(
  actor: AdminActor,
  input: {
    cardId: string;
    action: CeleCardAdminAction;
    reason?: string | null;
    planId?: string | null;
    months?: number | null;
    approvalRef?: string | null;
    deviceId?: string | null;
    correlationId?: string | null;
  }
) {
  requireAction(actor, input.action);
  const card = await prisma.digitalBusinessCard.findUnique({
    where: { id: input.cardId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, status: true, role: true } },
    },
  });
  if (!card) throw new CeleCardAdminError("Card not found.", 404);

  const previous = {
    subscriptionStatus: card.subscriptionStatus,
    isPublished: card.isPublished,
    adminSuspendedAt: card.adminSuspendedAt?.toISOString() ?? null,
    adminDeactivatedAt: card.adminDeactivatedAt?.toISOString() ?? null,
    entitlementKind: card.entitlementKind ?? null,
  };

  if (input.action === "deactivate") {
    const reason = requireReason(input.reason);
    const updated = await prisma.digitalBusinessCard.update({
      where: { id: card.id },
      data: { adminDeactivatedAt: new Date() },
    });
    await recordCeleCardLifecycleEvent({ cardId: card.id, kind: "CardDeactivated", meta: { reason } });
    await audit({
      actor,
      action: "UPDATE",
      cardId: card.id,
      customerId: card.userId,
      kind: "deactivate",
      previous,
      next: { adminDeactivatedAt: updated.adminDeactivatedAt?.toISOString() ?? null },
      reason,
      correlationId: input.correlationId,
    });
    return updated;
  }

  if (input.action === "reactivate") {
    if (card.adminSuspendedAt) {
      throw new CeleCardAdminError("Unsuspend this card before restoring public availability.", 409);
    }
    if (card.deletedAt) throw new CeleCardAdminError("Deleted cards cannot be reactivated.", 409);
    if (
      !isCeleCardFullyPublic(
        resolveCeleCardLifecycle({ ...card, adminDeactivatedAt: null }, new Date(), await getCeleCardLifecyclePolicy())
      )
    ) {
      throw new CeleCardAdminError("This card is not eligible to go live. Assign an entitlement first.", 409);
    }
    const updated = await prisma.digitalBusinessCard.update({
      where: { id: card.id },
      data: { adminDeactivatedAt: null, isPublished: true },
    });
    await recordCeleCardLifecycleEvent({ cardId: card.id, kind: "CardReactivated" });
    await audit({
      actor,
      action: "REACTIVATE",
      cardId: card.id,
      customerId: card.userId,
      kind: "reactivate",
      previous,
      next: { adminDeactivatedAt: null },
      reason: input.reason ?? null,
      correlationId: input.correlationId,
    });
    return updated;
  }

  if (input.action === "suspend") {
    const reason = requireReason(input.reason);
    const updated = await prisma.digitalBusinessCard.update({
      where: { id: card.id },
      data: { adminSuspendedAt: new Date() },
    });
    await recordCeleCardLifecycleEvent({ cardId: card.id, kind: "CardSuspended", meta: { reason } });
    await audit({
      actor,
      action: "SUSPEND",
      cardId: card.id,
      customerId: card.userId,
      kind: "suspend",
      previous,
      next: { adminSuspendedAt: updated.adminSuspendedAt?.toISOString() ?? null },
      reason,
      correlationId: input.correlationId,
    });
    return updated;
  }

  if (input.action === "unsuspend") {
    const updated = await prisma.digitalBusinessCard.update({
      where: { id: card.id },
      data: { adminSuspendedAt: null },
    });
    await recordCeleCardLifecycleEvent({ cardId: card.id, kind: "CardUnsuspended" });
    await audit({
      actor,
      action: "REACTIVATE",
      cardId: card.id,
      customerId: card.userId,
      kind: "unsuspend",
      previous,
      next: { adminSuspendedAt: null },
      reason: input.reason ?? null,
      correlationId: input.correlationId,
    });
    return updated;
  }

  if (input.action === "activate") {
    if (card.adminSuspendedAt) {
      throw new CeleCardAdminError("Unsuspend this card before activating.", 409);
    }
    if (
      isCeleCardFullyPublic(
        resolveCeleCardLifecycle({ ...card, adminDeactivatedAt: null }, new Date(), await getCeleCardLifecyclePolicy())
      )
    ) {
      return prisma.digitalBusinessCard.update({
        where: { id: card.id },
        data: { adminDeactivatedAt: null, isPublished: true },
      });
    }
    throw new CeleCardAdminError(
      "This card has no live entitlement. Use complimentary, promotional, or verified payment activation.",
      409
    );
  }

  if (input.action === "complimentary" || input.action === "promotional" || input.action === "manual" || input.action === "extend" || input.action === "change_plan") {
    const planId = input.planId || "monthly";
    const kind =
      input.action === "extend" || input.action === "change_plan"
        ? "extension"
        : input.action;
    return grantManualEntitlement(actor, {
      cardId: card.id,
      kind,
      planId,
      reason: input.reason ?? "",
      months: input.months,
      approvalRef: input.approvalRef,
      correlationId: input.correlationId,
    });
  }

  if (input.action === "duplicate_design") {
    await prisma.smartCardDesignVersion.create({
      data: {
        cardId: card.id,
        label: `Copy of ${card.themeId}`,
        themeId: card.themeId,
        config: { themeId: card.themeId, layout: "id-1", duplicatedBy: actor.id },
        status: "SAVED",
      },
    });
    await recordCeleCardLifecycleEvent({ cardId: card.id, kind: "DesignDuplicated" });
    await audit({
      actor,
      action: "UPDATE",
      cardId: card.id,
      customerId: card.userId,
      kind: "duplicate_design",
      correlationId: input.correlationId,
    });
    return card;
  }

  if (input.action === "save_draft") {
    const updated = await prisma.digitalBusinessCard.update({
      where: { id: card.id },
      data: { isPublished: false },
    });
    await audit({
      actor,
      action: "UPDATE",
      cardId: card.id,
      customerId: card.userId,
      kind: "save_draft",
      previous,
      next: { isPublished: false },
      correlationId: input.correlationId,
    });
    return updated;
  }

  if (input.action === "send_invitation") {
    const email = normalizeClaimEmail(card.unclaimedEmail || card.email || card.user?.email);
    if (!email) throw new CeleCardAdminError("No invitation email on this card.");
    const claim = await issueClaimInvite({
      cardId: card.id,
      email,
      phone: card.unclaimedPhone || card.phone,
      actor,
    });
    const origin = getCeleYouShareOrigin();
    const publicUrl = digitalCardPublicUrl(card.slug, origin);
    await communicationService.trySendDirect({
      channel: "EMAIL",
      to: email,
      subject: "Your CeleYou is ready",
      body: `A CeleYou was prepared for you. Open ${claim.claimUrl} with this email address to claim ownership. Your public card link is ${publicUrl}. This message does not include private access codes or payment details.`,
    });
    await recordCeleCardLifecycleEvent({ cardId: card.id, kind: "AdminInvitationSent", meta: { email } });
    await audit({
      actor,
      action: "UPDATE",
      cardId: card.id,
      customerId: card.userId,
      kind: "send_invitation",
      reason: "invitation_sent",
      correlationId: input.correlationId,
    });
    return { ...card, claimUrl: claim.claimUrl, claimExpiresAt: claim.expiresAt };
  }

  if (input.action === "remind_renewal") {
    const email = normalizeClaimEmail(card.email || card.user?.email);
    if (!email) throw new CeleCardAdminError("No contact email for a renewal reminder.");
    await communicationService.trySendDirect({
      channel: "EMAIL",
      to: email,
      subject: "Your CeleYou term",
      body: `Your CeleYou remains available for renewal from your dashboard. This reminder does not include payment credentials.`,
    });
    await audit({
      actor,
      action: "UPDATE",
      cardId: card.id,
      customerId: card.userId,
      kind: "remind_renewal",
      correlationId: input.correlationId,
    });
    return card;
  }

  const nfcAction = nfcActionFromAdminAction(input.action);
  if (nfcAction) {
    if (nfcAction === "lost" || nfcAction === "replace" || nfcAction === "revoke") {
      requireReason(input.reason, "reason");
    }
    const previousToken = card.publicToken;
    const previousSlug = card.slug;
    const result = await applyNfcDeviceMutation(card, {
      action: nfcAction,
      deviceId: input.deviceId || undefined,
    });
    if (!("ok" in result) || !result.ok) {
      throw new CeleCardAdminError(
        "error" in result && result.error ? result.error : "NFC action failed",
        409,
        "nfc_conflict"
      );
    }
    const desk = await listNfcDevicesForCard(card, getCeleYouShareOrigin());
    await audit({
      actor,
      action: "UPDATE",
      cardId: card.id,
      customerId: card.userId,
      kind: input.action,
      previous: { slug: previousSlug, publicToken: previousToken },
      next: {
        nfcAction,
        deviceId: result.deviceId,
        slugUnchanged: true,
        qrTokenUnchanged: true,
      },
      reason: input.reason?.trim() || null,
      correlationId: input.correlationId,
    });
    return { ...card, nfc: desk, slugUnchanged: card.slug === previousSlug, tokenUnchanged: card.publicToken === previousToken };
  }

  throw new CeleCardAdminError("Unknown action.", 400);
}

export async function getCeleCardAdminDetail(cardId: string) {
  const card = await prisma.digitalBusinessCard.findUnique({
    where: { id: cardId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, status: true, role: true, createdAt: true } },
      designVersions: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, label: true, themeId: true, status: true, createdAt: true } },
      entitlementGrants: { orderBy: { createdAt: "desc" }, take: 20 },
      claimInvites: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, email: true, expiresAt: true, consumedAt: true, createdAt: true },
      },
      connections: { orderBy: { createdAt: "desc" }, take: 20 },
      _count: { select: { accessCodes: true, accessGrants: true, accessRequests: true, connections: true } },
    },
  });
  if (!card) return null;
  const origin = getCeleYouShareOrigin();
  const policy = await getCeleCardLifecyclePolicy();
  const events = await prisma.smartCardLifecycleEvent.findMany({
    where: { cardId },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  const payments = await listCeleYouPaymentsForCard({
    cardId,
    userId: card.userId,
    page: 1,
    limit: 20,
  }).catch(() => ({ items: [], total: 0, page: 1, limit: 20 }));
  return {
    card: serializeDirectoryCard(card, origin, policy),
    owner: isUnclaimedHolderEmail(card.user?.email)
      ? { id: null, name: card.displayName, email: card.unclaimedEmail, unclaimed: true }
      : card.user,
    designs: card.designVersions,
    payments: payments.items,
    paymentTotal: payments.total,
    paymentPage: payments.page,
    paymentLimit: payments.limit,
    entitlements: card.entitlementGrants.map((row) => ({
      id: row.id,
      kind: row.kind,
      planId: row.planId,
      months: row.months,
      startsAt: row.startsAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      reason: row.reason,
      grantedByUserId: row.grantedByUserId,
      approvalRef: row.approvalRef,
      createdAt: row.createdAt.toISOString(),
    })),
    invites: card.claimInvites.map((row) => ({
      id: row.id,
      email: row.email,
      expiresAt: row.expiresAt.toISOString(),
      consumedAt: row.consumedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
    connections: card.connections,
    activity: events.map((row) => ({
      id: row.id,
      kind: row.kind,
      meta: redactActivityMeta(row.meta),
      createdAt: row.createdAt.toISOString(),
    })),
    privacy: {
      accessCodeCount: card._count.accessCodes,
      accessGrantCount: card._count.accessGrants,
      accessRequestCount: card._count.accessRequests,
      connectionCount: card._count.connections,
    },
    sharing: {
      publicUrl: digitalCardPublicUrl(card.slug, origin),
      canonicalUrl: celeCardStableQrUrl(card.publicToken, origin),
      qrImageSrc: digitalCardQrImageSrc(celeCardStableQrUrl(card.publicToken, origin), {
        size: 1024,
        variant: "guide",
        download: true,
      }),
      qrPngSrc: celeYouPrintQrPngSrc(celeCardStableQrUrl(card.publicToken, origin)),
      qrSvgSrc: celeYouPrintQrSvgSrc(celeCardStableQrUrl(card.publicToken, origin)),
      cardImageSrc: digitalCardExportImagePath(card.slug),
    },
    nfc: await listNfcDevicesForCard(card, origin),
    profile: {
      displayName: card.displayName,
      title: card.title,
      company: card.company,
      bio: card.bio,
      email: card.email,
      phone: card.phone,
      website: card.website,
      themeId: card.themeId,
    },
  };
}

function redactActivityMeta(meta: unknown) {
  if (!meta || typeof meta !== "object") return {};
  const copy = { ...(meta as Record<string, unknown>) };
  for (const key of ["token", "password", "accessCode", "secret", "authorization", "cardNumber"]) {
    delete copy[key];
  }
  return copy;
}

export async function updateAssistedCeleCard(
  actor: AdminActor,
  cardId: string,
  input: Partial<AssistedCreateInput>
) {
  requireAction(actor, "save_draft");
  const card = await prisma.digitalBusinessCard.findUnique({ where: { id: cardId } });
  if (!card) throw new CeleCardAdminError("Card not found.", 404);
  const theme = resolveDigitalCardTheme(input.themeId ?? card.themeId);
  const updated = await prisma.digitalBusinessCard.update({
    where: { id: cardId },
    data: {
      displayName: input.displayName?.trim() || undefined,
      title: input.title !== undefined ? input.title?.trim() || null : undefined,
      company: input.company !== undefined ? input.company?.trim() || null : undefined,
      bio: input.bio !== undefined ? clipCeleCardBio(input.bio?.trim()) || null : undefined,
      email: input.email !== undefined ? input.email?.trim() || null : undefined,
      phone: input.phone !== undefined ? input.phone?.trim() || null : undefined,
      website: input.website !== undefined ? input.website?.trim() || null : undefined,
      socials: input.socials !== undefined ? (input.socials as object) : undefined,
      avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl || null : undefined,
      themeId: theme.id,
      connectBackEnabled: input.connectBackEnabled,
    },
  });
  await audit({
    actor,
    action: "UPDATE",
    cardId,
    customerId: card.userId,
    kind: "assisted_edit",
  });
  return updated;
}

export async function claimCeleCardWithToken(input: { token: string; userId: string }) {
  const token = input.token.trim();
  if (!token) throw new CeleCardAdminError("Claim token required.", 400);
  const tokenHash = hashCeleCardClaimToken(token);
  const invite = await prisma.smartCardClaimInvite.findUnique({ where: { tokenHash } });
  if (!claimInviteIsUsable(invite)) {
    throw new CeleCardAdminError("This claim link is invalid or has already been used.", 400, "claim_invalid");
  }
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true, status: true },
  });
  if (!user || user.status === "SUSPENDED") {
    throw new CeleCardAdminError("Sign in with the invited email to claim this card.", 403);
  }
  if (!emailsMatchForClaim(user.email, invite!.email)) {
    throw new CeleCardAdminError("This invitation is assigned to a different email address.", 403, "email_mismatch");
  }
  const card = await prisma.digitalBusinessCard.findUnique({ where: { id: invite!.cardId } });
  if (!card || card.deletedAt) throw new CeleCardAdminError("Card not found.", 404);
  if (card.claimedAt && card.userId !== (await getUnclaimedHolderUserId()) && card.userId !== user.id) {
    throw new CeleCardAdminError("This card already has an owner.", 409, "already_claimed");
  }

  const consumed = await prisma.smartCardClaimInvite.updateMany({
    where: { id: invite!.id, consumedAt: null },
    data: { consumedAt: new Date(), consumedByUserId: user.id },
  });
  if (consumed.count !== 1) {
    throw new CeleCardAdminError("This claim link is invalid or has already been used.", 409, "replay");
  }

  const updated = await prisma.digitalBusinessCard.update({
    where: { id: card.id },
    data: {
      userId: user.id,
      claimedAt: new Date(),
      unclaimedEmail: null,
      unclaimedPhone: null,
      email: card.email || user.email,
    },
  });
  await recordCeleCardLifecycleEvent({
    cardId: card.id,
    kind: "CardClaimed",
    meta: { userId: user.id },
  });
  await createAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "celecard",
    entityId: card.id,
    details: { kind: "claimed", previousOwner: card.userId, nextOwner: user.id },
  });
  return updated;
}

export async function previewBulkCeleCardOperation(input: { ids: string[]; action: string }) {
  const unique = [...new Set(input.ids.filter(Boolean))].slice(0, 500);
  const rows = await prisma.digitalBusinessCard.findMany({
    where: { id: { in: unique } },
    select: { id: true, slug: true, displayName: true, subscriptionStatus: true, adminSuspendedAt: true },
    take: 500,
  });
  return {
    action: input.action,
    requested: unique.length,
    matched: rows.length,
    records: rows,
  };
}

export { CELECARD_ACTION_PERMISSION, Permission };
