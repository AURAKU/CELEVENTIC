import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DIGITAL_CARD_TRIAL_DAYS,
  clipCeleCardBio,
  normalizeSocials,
  type DigitalCardPublicPayload,
  type DigitalCardSocials,
} from "@/lib/digital-business-card/types";
import { resolveDigitalCardTheme, type DigitalCardThemeId } from "@/lib/digital-business-card/themes";
import { CELEYOU_ORIGINAL_THEME_ID } from "@/lib/digital-business-card/brand-lock";
import {
  CeleYouPaidTermLockedError,
  DEFAULT_CELECARD_LIFECYCLE_POLICY,
  celeCardPublicPresentation,
  celeYouPaidTermIsRunning,
  isCeleCardFullyPublic,
  isWithinPaidWindow,
  pickAccountPaidEntitlement,
  renewalBaseDate,
  resolveCeleCardLifecycle,
  type CeleCardLifecycleInput,
  type CeleCardLifecyclePolicy,
} from "@/lib/digital-business-card/lifecycle";
import {
  CELEYOU_FREE_PUBLISH_LIMIT_MESSAGE,
  canPublishAnotherCeleYou,
  celeYouAccessTier,
  inferLegacyCeleYouTrial,
} from "@/lib/digital-business-card/freemium";
import { pickCurrentNfcDevice } from "@/lib/digital-business-card/nfc-device";
import {
  CELEYOU_ANALYTICS_TREND_MAX_ROWS,
  CELEYOU_CONTACT_ATTRIBUTION,
  CELEYOU_NFC_ATTRIBUTION,
  CELEYOU_PAYMENT_ATTRIBUTION,
  CELEYOU_QR_ATTRIBUTION,
  CELEYOU_SHARE_ATTRIBUTION,
  buildCeleYouTrendSeries,
  celeYouDeviceBreakdown,
  celeYouPopularLinks,
  celeYouTrendWindow,
  clampAnalyticsRangeDays,
  sanitizeCeleYouActivityMeta,
} from "@/lib/digital-business-card/analytics";
import { isReservedCeleYouShareToken } from "@/lib/digital-business-card/share-identity";
import { bridgeCardSlug } from "@/services/digital-business-card/username.service";
import { randomBytes } from "node:crypto";
import { sha256Hex } from "@/lib/crypto/sha256-hex";
import { pesewasMatch } from "@/lib/digital-business-card/plans";
import {
  digitalCardSlugCandidates,
  isProtectedDigitalCardSlug,
  pickAvailableDigitalCardSlug,
  slugifyDigitalCardBase,
  type DigitalCardSlugSeed,
} from "@/lib/digital-business-card/slug";

export type AllocateDigitalCardSlugOptions = DigitalCardSlugSeed & {
  excludeId?: string;
};

function isSlugConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function allocateDigitalCardSlug(
  preferred: string,
  excludeIdOrOptions?: string | AllocateDigitalCardSlugOptions
): Promise<string> {
  const options =
    typeof excludeIdOrOptions === "string"
      ? { excludeId: excludeIdOrOptions, preferred }
      : { preferred, ...(excludeIdOrOptions ?? {}) };
  const candidates = digitalCardSlugCandidates({
    preferred: options.preferred || preferred,
    displayName: options.displayName || preferred,
    company: options.company,
    title: options.title,
  });
  const base = slugifyDigitalCardBase(candidates[0] || preferred) || "card";
  const rows = await prisma.digitalBusinessCard.findMany({
    where: {
      OR: [{ slug: { in: candidates } }, { slug: { startsWith: `${base}-` } }],
    },
    select: { id: true, slug: true },
  });
  const taken = new Set(
    rows.filter((row) => row.id !== options.excludeId).map((row) => row.slug)
  );
  return pickAvailableDigitalCardSlug(candidates, (slug) => taken.has(slug) || isProtectedDigitalCardSlug(slug));
}

export async function proposeDigitalCardSlug(input: AllocateDigitalCardSlugOptions) {
  const requested = slugifyDigitalCardBase(input.preferred || input.displayName || "") || "card";
  const slug = await allocateDigitalCardSlug(requested, input);
  return {
    requested,
    slug,
    available: slug === requested && !isProtectedDigitalCardSlug(requested),
    adjusted: slug !== requested,
  };
}

export function isDigitalCardLive(
  card: CeleCardLifecycleInput,
  now = new Date(),
  policy: CeleCardLifecyclePolicy = DEFAULT_CELECARD_LIFECYCLE_POLICY
): boolean {
  return isCeleCardFullyPublic(resolveCeleCardLifecycle(card, now, policy));
}

async function celeCardPolicyForLiveGate(): Promise<CeleCardLifecyclePolicy> {
  const { getCeleCardLifecyclePolicy } = await import(
    "@/services/digital-business-card/lifecycle-policy.service"
  );
  return getCeleCardLifecyclePolicy();
}

export function toPublicPayload(card: {
  id: string;
  slug: string;
  publicToken: string;
  displayName: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  socials: unknown;
  themeId: string;
  avatarUrl: string | null;
  nfcEnabled: boolean;
  connectBackEnabled?: boolean;
  defaultMode?: string;
  isPublished: boolean;
  subscriptionStatus: string;
  subscriptionExpiresAt: Date | null;
  adminSuspendedAt?: Date | null;
  adminDeactivatedAt?: Date | null;
  deletedAt?: Date | null;
  lastActivatedAt?: Date | null;
  lastCourtesyAt?: Date | null;
}, policy: CeleCardLifecyclePolicy = DEFAULT_CELECARD_LIFECYCLE_POLICY): DigitalCardPublicPayload {
  const theme = resolveDigitalCardTheme(card.themeId);
  return {
    id: card.id,
    slug: card.slug,
    publicToken: card.publicToken,
    displayName: card.displayName,
    title: card.title,
    company: card.company,
    bio: card.bio,
    email: card.email,
    phone: card.phone,
    website: card.website,
    socials: normalizeSocials(card.socials),
    themeId: theme.id,
    avatarUrl: card.avatarUrl,
    pronouns: null,
    nfcEnabled: card.nfcEnabled,
    connectBackEnabled: card.connectBackEnabled !== false,
    defaultMode: card.defaultMode || "professional",
    isLive: isDigitalCardLive(card, new Date(), policy),
    presentationMode: celeCardPublicPresentation(card, new Date(), policy),
  };
}

export class CeleYouPublishLimitError extends Error {
  readonly status = 409;
  constructor(message = CELEYOU_FREE_PUBLISH_LIMIT_MESSAGE) {
    super(message);
    this.name = "CeleYouPublishLimitError";
  }
}

async function celeYouUserAccess(userId: string) {
  const cards = await prisma.digitalBusinessCard.findMany({
    where: { userId, deletedAt: null },
    select: {
      id: true,
      isPublished: true,
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
      lastActivatedAt: true,
    },
  });
  const trial = await prisma.celeYouTrialRecord.findUnique({ where: { userId } }).catch(() => null);
  const snapshot = trial
    ? {
        userId,
        family: trial.family === "business" ? ("business" as const) : ("pro" as const),
        status: trial.status as "ELIGIBLE" | "ACTIVE" | "CONVERTED" | "EXPIRED" | "BLOCKED",
        startedAt: trial.startedAt,
        expiresAt: trial.expiresAt,
        convertedAt: trial.convertedAt,
        durationDays: trial.durationDays,
      }
    : inferLegacyCeleYouTrial(userId, cards);
  const paid = cards.find((item) => isWithinPaidWindow(item)) ?? cards[0];
  const dummy = {
    isPublished: false,
    subscriptionStatus: "FREE",
    subscriptionExpiresAt: null,
    lastActivatedAt: null,
  };
  return {
    tier: celeYouAccessTier({ card: paid || dummy, trial: snapshot }),
    publishedCount: cards.filter((item) => item.isPublished).length,
  };
}

export function trialExpiryFromNow(from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + DIGITAL_CARD_TRIAL_DAYS);
  return d;
}

export type UpsertDigitalCardInput = {
  displayName?: string;
  title?: string | null;
  company?: string | null;
  bio?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  socials?: DigitalCardSocials;
  themeId?: DigitalCardThemeId | string;
  avatarUrl?: string | null;
  slug?: string;
  isPublished?: boolean;
  nfcEnabled?: boolean;
  proximityDiscoverable?: boolean;
};

function isRetainedCard<T extends { deletedAt?: Date | null }>(card: T) {
  return !card.deletedAt;
}

export async function listDigitalCardsForUser(userId: string) {
  const cards = await prisma.digitalBusinessCard.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return cards.filter(isRetainedCard);
}

export async function getDigitalCardBySlug(slug: string) {
  return prisma.digitalBusinessCard.findUnique({ where: { slug } });
}

export async function getDigitalCardByPublicToken(publicToken: string) {
  return prisma.digitalBusinessCard.findUnique({ where: { publicToken } });
}

function newNfcClaimSecretHash(): string {
  return sha256Hex(randomBytes(32).toString("base64url"));
}

export async function ensureDefaultNfcDevice(card: { id: string; publicToken: string }) {
  const devices = await prisma.smartCardNfcDevice.findMany({
    where: { cardId: card.id },
    orderBy: { createdAt: "asc" },
  });
  const existing = pickCurrentNfcDevice(devices);
  if (existing) {
    const colliding =
      existing.publicToken === card.publicToken || isReservedCeleYouShareToken(existing.publicToken);
    // A paused or lost physical card already stores this URL. Do not mint a new token
    // just because it is not ACTIVE. Only retire a live tag that still shares the QR token.
    if (existing.status === "ACTIVE" && colliding) {
      await prisma.smartCardNfcDevice.update({
        where: { id: existing.id },
        data: { status: "REPLACED" },
      });
    } else {
      if (!existing.claimSecretHash) {
        await prisma.smartCardNfcDevice.update({
          where: { id: existing.id },
          data: { claimSecretHash: newNfcClaimSecretHash() },
        });
      }
      return existing;
    }
  }
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const created = await prisma.smartCardNfcDevice.create({
      data: {
        cardId: card.id,
        name: "CeleYou card",
        deviceType: "card",
        claimSecretHash: newNfcClaimSecretHash(),
      },
    });
    if (created.publicToken !== card.publicToken && !isReservedCeleYouShareToken(created.publicToken)) {
      return created;
    }
    await prisma.smartCardNfcDevice.delete({ where: { id: created.id } }).catch(() => undefined);
  }
  throw new Error("Could not allocate a unique NFC tap token");
}

export async function nfcTokensByCardId(cards: { id: string; publicToken: string }[]) {
  const tokens = new Map<string, string>();
  if (!cards.length) return tokens;
  const existing = await prisma.smartCardNfcDevice.findMany({
    where: { cardId: { in: cards.map((card) => card.id) }, status: { in: ["ACTIVE", "DISABLED", "LOST"] } },
    orderBy: { createdAt: "asc" },
  });
  const byCard = new Map<string, typeof existing>();
  for (const row of existing) {
    const list = byCard.get(row.cardId) ?? [];
    list.push(row);
    byCard.set(row.cardId, list);
  }
  for (const card of cards) {
    const current = pickCurrentNfcDevice(byCard.get(card.id) ?? []);
    if (current?.publicToken && !isReservedCeleYouShareToken(current.publicToken)) {
      tokens.set(card.id, current.publicToken);
    }
  }
  for (const card of cards) {
    if (tokens.has(card.id)) continue;
    const device = await ensureDefaultNfcDevice(card);
    tokens.set(card.id, device.publicToken);
  }
  return tokens;
}

export async function createSmartCardConnection(input: {
  cardId: string;
  visitorName: string;
  visitorEmail?: string | null;
  visitorPhone?: string | null;
  visitorCompany?: string | null;
  visitorTitle?: string | null;
  note?: string | null;
  formMode?: string;
  source?: string;
  tags?: string[];
  campaignId?: string | null;
  eventId?: string | null;
}) {
  const name = input.visitorName.trim();
  if (name.length < 2) throw new Error("Name is required");
  const email = input.visitorEmail?.trim() || null;
  const phone = input.visitorPhone?.trim() || null;
  if (!email && !phone) throw new Error("Email or phone is required");

  const visitorCompany = input.visitorCompany?.trim() || null;
  const visitorTitle = input.visitorTitle?.trim() || null;
  const note = input.note?.trim() || null;
  const { celeYouConnectSearchText } = await import("@/lib/celeyou-connect/pair");
  const connection = await prisma.smartCardConnection.create({
    data: {
      cardId: input.cardId,
      visitorName: name,
      visitorEmail: email,
      visitorPhone: phone,
      visitorCompany,
      visitorTitle,
      note,
      formMode: input.formMode || "Instant",
      campaignId: input.campaignId || null,
      eventId: input.eventId || null,
      status: "NEW",
      source: input.source || "connect_back",
      tags: input.tags ?? [],
      consentAt: new Date(),
      searchText: celeYouConnectSearchText({
        visitorName: name,
        visitorEmail: email,
        visitorPhone: phone,
        visitorCompany,
        visitorTitle,
        note,
      }),
    },
  });

  await prisma.smartCardInteraction
    .create({
      data: {
        cardId: input.cardId,
        campaignId: input.campaignId || null,
        kind: "connect",
        meta: { connectionId: connection.id, formMode: connection.formMode },
      },
    })
    .catch(() => undefined);

  return connection;
}

export async function getDigitalCardForUser(userId: string, id: string) {
  const card = await prisma.digitalBusinessCard.findFirst({ where: { id, userId } });
  if (!card || !isRetainedCard(card)) return null;
  return card;
}

type AccountEntitlementSource = {
  id: string;
  userId: string;
  subscriptionStatus: string;
  subscriptionExpiresAt: Date | null;
  lastActivatedAt: Date | null;
  lastActivationPaymentId: string | null;
  entitlementKind: string | null;
};

function accountEntitlementWrite(source: AccountEntitlementSource) {
  return {
    subscriptionStatus: source.subscriptionStatus,
    subscriptionExpiresAt: source.subscriptionExpiresAt,
    lastActivatedAt: source.lastActivatedAt,
    lastActivationPaymentId: source.lastActivationPaymentId,
    entitlementKind: source.entitlementKind,
    lastCourtesyAt: null,
  };
}

export async function findAccountPaidEntitlement(userId: string, now = new Date()) {
  const cards = await listDigitalCardsForUser(userId);
  const policy = await celeCardPolicyForLiveGate();
  return pickAccountPaidEntitlement(cards, now, policy);
}

export async function attachDigitalCardToAccountEntitlement(
  cardId: string,
  source: AccountEntitlementSource
) {
  return prisma.digitalBusinessCard.update({
    where: { id: cardId },
    data: accountEntitlementWrite(source),
  });
}

export async function propagateAccountEntitlement(source: AccountEntitlementSource) {
  await prisma.digitalBusinessCard.updateMany({
    where: { userId: source.userId, deletedAt: null, id: { not: source.id } },
    data: accountEntitlementWrite(source),
  });
}

export async function createDigitalCard(userId: string, input: UpsertDigitalCardInput) {
  const displayName = (input.displayName ?? "").trim();
  if (displayName.length < 2) {
    throw new Error("displayName required");
  }
  const theme = resolveDigitalCardTheme(input.themeId ?? CELEYOU_ORIGINAL_THEME_ID);
  const slugSeed = {
    displayName,
    company: input.company?.trim() || null,
    title: input.title?.trim() || null,
  };
  const household = await findAccountPaidEntitlement(userId);
  const entitlement = household
    ? accountEntitlementWrite(household)
    : {
        subscriptionStatus: "FREE",
        subscriptionExpiresAt: null,
      };
  const access = await celeYouUserAccess(userId);
  const wantsPublish = input.isPublished ?? true;
  const isPublished =
    wantsPublish &&
    canPublishAnotherCeleYou({ tier: access.tier, publishedCount: access.publishedCount });
  if (wantsPublish && !isPublished && input.isPublished === true) {
    throw new CeleYouPublishLimitError();
  }
  let created: Awaited<ReturnType<typeof prisma.digitalBusinessCard.create>> | null = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const slug = await allocateDigitalCardSlug(input.slug || displayName, slugSeed);
    try {
      created = await prisma.digitalBusinessCard.create({
        data: {
          userId,
          slug,
          displayName,
          title: slugSeed.title,
          company: slugSeed.company,
          bio: clipCeleCardBio(input.bio?.trim()) || null,
          email: input.email?.trim() || null,
          phone: input.phone?.trim() || null,
          website: input.website?.trim() || null,
          socials: (input.socials ?? {}) as object,
          themeId: theme.id,
          avatarUrl: input.avatarUrl || null,
          isPublished,
          nfcEnabled: input.nfcEnabled ?? true,
          ...entitlement,
        },
      });
      break;
    } catch (error) {
      if (!isSlugConflict(error) || attempt === 3) throw error;
    }
  }
  if (!created) throw new Error("Could not allocate a unique public link");
  await bridgeCardSlug({ id: created.id, userId: created.userId, slug: created.slug });
  await ensureDefaultNfcDevice(created);
  await recordCeleCardLifecycleEvent({
    cardId: created.id,
    kind: "CardCreated",
    meta: household ? { inheritedEntitlementFrom: household.id } : undefined,
  });
  await prisma.smartCardDesignVersion
    .create({
      data: {
        cardId: created.id,
        label: "Original design",
        themeId: created.themeId,
        config: { themeId: created.themeId, layout: "id-1" },
        status: "SAVED",
      },
    })
    .catch(() => undefined);
  return created;
}

export async function updateDigitalCard(userId: string, id: string, input: UpsertDigitalCardInput) {
  const existing = await getDigitalCardForUser(userId, id);
  if (!existing) return null;
  const theme = resolveDigitalCardTheme(input.themeId ?? existing.themeId);
  let slug = existing.slug;
  if (input.slug && input.slug !== existing.slug) {
    slug = await allocateDigitalCardSlug(input.slug, {
      excludeId: existing.id,
      displayName: input.displayName ?? existing.displayName,
      company: input.company !== undefined ? input.company : existing.company,
      title: input.title !== undefined ? input.title : existing.title,
    });
  }
  if (input.isPublished === true && !existing.isPublished) {
    const access = await celeYouUserAccess(userId);
    if (!canPublishAnotherCeleYou({ tier: access.tier, publishedCount: access.publishedCount })) {
      throw new CeleYouPublishLimitError();
    }
  }
  const nextTheme = theme.id;
  if (nextTheme !== existing.themeId) {
    await prisma.smartCardDesignVersion
      .create({
        data: {
          cardId: existing.id,
          label: `Saved ${existing.themeId}`,
          themeId: existing.themeId,
          config: { themeId: existing.themeId, layout: "id-1" },
          status: "SAVED",
        },
      })
      .catch(() => undefined);
  }
  const updated = await prisma.digitalBusinessCard.update({
    where: { id: existing.id },
    data: {
      slug,
      displayName:
        input.displayName !== undefined ? input.displayName.trim() : undefined,
      title: input.title !== undefined ? input.title?.trim() || null : undefined,
      company: input.company !== undefined ? input.company?.trim() || null : undefined,
      bio: input.bio !== undefined ? clipCeleCardBio(input.bio?.trim()) || null : undefined,
      email: input.email !== undefined ? input.email?.trim() || null : undefined,
      phone: input.phone !== undefined ? input.phone?.trim() || null : undefined,
      website: input.website !== undefined ? input.website?.trim() || null : undefined,
      socials: input.socials !== undefined ? (input.socials as object) : undefined,
      themeId: nextTheme,
      avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl || null : undefined,
      isPublished: input.isPublished !== undefined ? input.isPublished : undefined,
      nfcEnabled: input.nfcEnabled !== undefined ? input.nfcEnabled : undefined,
      proximityDiscoverable:
        input.proximityDiscoverable !== undefined ? input.proximityDiscoverable : undefined,
    },
  });
  if (updated.slug !== existing.slug) {
    await bridgeCardSlug({
      id: updated.id,
      userId: updated.userId,
      slug: updated.slug,
      previousSlug: existing.slug,
    });
  }
  return updated;
}

/** Paid activation only, never called from a free studio PATCH. */
export async function activateDigitalCardFromPayment(input: {
  userId: string;
  cardId: string;
  planId: string;
  amountGhs: number;
  paymentId?: string | null;
  /** Price quoted at checkout. Prefer this over today's catalog so a later price change cannot withhold a paid card. */
  chargedPriceGhs?: number | null;
  months?: number | null;
}) {
  const { smartCardExpiryFromNow, getSmartCardPlanFromCatalog, getSmartCardPlan } = await import(
    "@/lib/digital-business-card/plans"
  );
  const { getCeleCardCatalog } = await import("@/services/digital-business-card/catalog.service");
  const catalog = await getCeleCardCatalog().catch(() => null);
  const plan = getSmartCardPlanFromCatalog(input.planId, catalog?.plans) ?? getSmartCardPlan(input.planId);
  const months = Number(input.months) > 0 ? Number(input.months) : plan?.months;
  if (!months) return null;
  const expectedCharge =
    input.chargedPriceGhs != null && Number.isFinite(Number(input.chargedPriceGhs))
      ? Number(input.chargedPriceGhs)
      : plan?.priceGhs;
  if (expectedCharge == null || !pesewasMatch(expectedCharge, Number(input.amountGhs))) {
    console.error("[smartcard.activate] amount mismatch", input.planId, input.amountGhs, expectedCharge);
    return null;
  }
  const existing = await getDigitalCardForUser(input.userId, input.cardId);
  if (!existing) return null;
  if (existing.deletedAt || existing.adminSuspendedAt) {
    console.error("[smartcard.activate] blocked restricted card", existing.id);
    return null;
  }
  if (input.paymentId && existing.lastActivationPaymentId === input.paymentId) {
    return existing;
  }
  const policy = await celeCardPolicyForLiveGate();
  const now = new Date();
  const household = await findAccountPaidEntitlement(input.userId, now);
  if (household && isWithinPaidWindow(household, now)) {
    if (existing.id !== household.id && !isWithinPaidWindow(existing, now)) {
      return attachDigitalCardToAccountEntitlement(existing.id, household);
    }
    return existing;
  }
  const wasLive = isDigitalCardLive(existing, now, policy);
  const base = renewalBaseDate(existing, now, policy);
  const expires = smartCardExpiryFromNow(months, base);
  const { renewalMustNotShorten } = await import("@/lib/digital-business-card/billing-rules");
  if (!renewalMustNotShorten(existing.subscriptionExpiresAt, expires, now)) {
    console.error("[smartcard.activate] refused to shorten paid term", existing.id);
    return existing;
  }
  const updated = await prisma.digitalBusinessCard.update({
    where: { id: existing.id },
    data: {
      subscriptionStatus: "ACTIVE",
      subscriptionExpiresAt: expires,
      isPublished: true,
      lastActivatedAt: now,
      lastActivationPaymentId: input.paymentId || existing.lastActivationPaymentId,
      lastCourtesyAt: null,
      entitlementKind: "PAID",
    },
  });
  await propagateAccountEntitlement(updated);
  await recordCeleCardLifecycleEvent({
    cardId: existing.id,
    kind: wasLive ? "SubscriptionRenewed" : "SubscriptionActivated",
    meta: {
      planId: plan?.id ?? input.planId,
      paymentId: input.paymentId ?? null,
      months,
      amountGhs: input.amountGhs,
    },
  });
  await notifyCeleYouBillingOutcome({
    userId: input.userId,
    cardId: existing.id,
    displayName: existing.displayName,
    paymentId: input.paymentId,
    renewed: wasLive,
    expires,
  });
  await import("@/services/digital-business-card/trial.service")
    .then(({ convertCeleYouTrialToPaid }) =>
      convertCeleYouTrialToPaid({ userId: input.userId, planId: plan?.id ?? input.planId })
    )
    .catch(() => undefined);
  return updated;
}

async function notifyCeleYouBillingOutcome(input: {
  userId: string;
  cardId: string;
  displayName: string;
  paymentId?: string | null;
  renewed: boolean;
  expires: Date;
}) {
  try {
    const { notificationService } = await import("@/services/notifications/notification.service");
    const day = input.expires.toISOString().slice(0, 10);
    const type = input.renewed ? "CELECARD_RENEWED" : "CELECARD_ACTIVATED";
    const link = `/dashboard/business-card/billing?card=${input.cardId}&term=${day}${
      input.paymentId ? `&payment=${input.paymentId}` : ""
    }`;
    const already = await prisma.notification.findFirst({
      where: { userId: input.userId, type, link },
      select: { id: true },
    });
    if (already) return;
    await notificationService.notify(input.userId, {
      title: input.renewed ? "CeleYou renewed" : "CeleYou is live",
      message: input.renewed
        ? `${input.displayName} stays live until ${day}.`
        : `${input.displayName} is active until ${day}.`,
      type,
      link,
    });
  } catch {
    /* Notification must never block activation. */
  }
}

/** Admin / test bypass. Still requires an authenticated platform admin at the route. */
export async function activateDigitalCardPlan(userId: string, id: string, planId: string) {
  const { getSmartCardPlan, smartCardExpiryFromNow } = await import("@/lib/digital-business-card/plans");
  const plan = getSmartCardPlan(planId);
  if (!plan) return null;
  const existing = await getDigitalCardForUser(userId, id);
  if (!existing) return null;
  if (existing.deletedAt || existing.adminSuspendedAt) return null;
  const policy = await celeCardPolicyForLiveGate();
  const now = new Date();
  const household = await findAccountPaidEntitlement(userId, now);
  if (household && isWithinPaidWindow(household, now)) {
    if (existing.id !== household.id && !isWithinPaidWindow(existing, now)) {
      return attachDigitalCardToAccountEntitlement(existing.id, household);
    }
    return existing;
  }
  const wasLive = isDigitalCardLive(existing, now, policy);
  const base = renewalBaseDate(existing, now, policy);
  const updated = await prisma.digitalBusinessCard.update({
    where: { id: existing.id },
    data: {
      subscriptionStatus: "ACTIVE",
      subscriptionExpiresAt: smartCardExpiryFromNow(plan.months, base),
      isPublished: true,
      lastActivatedAt: now,
      lastCourtesyAt: null,
    },
  });
  await propagateAccountEntitlement(updated);
  await recordCeleCardLifecycleEvent({
    cardId: existing.id,
    kind: wasLive ? "SubscriptionRenewed" : "SubscriptionActivated",
    meta: { planId: plan.id, adminBypass: true, months: plan.months },
  });
  return updated;
}

export async function recordCeleCardLifecycleEvent(input: {
  cardId: string;
  kind: string;
  meta?: Record<string, unknown>;
}) {
  try {
    await prisma.smartCardLifecycleEvent?.create({
      data: {
        cardId: input.cardId,
        kind: input.kind,
        meta: (input.meta ?? {}) as object,
      },
    });
  } catch {
    /* Analytics must never block checkout or card saves. */
  }
}

export async function softDeleteDigitalCard(userId: string, id: string) {
  const existing = await getDigitalCardForUser(userId, id);
  if (!existing) return null;
  const policy = await celeCardPolicyForLiveGate();
  if (celeYouPaidTermIsRunning(existing, new Date(), policy)) {
    throw new CeleYouPaidTermLockedError();
  }
  const updated = await prisma.digitalBusinessCard.update({
    where: { id: existing.id },
    data: { deletedAt: new Date(), isPublished: false },
  });
  await recordCeleCardLifecycleEvent({ cardId: existing.id, kind: "CardDeleted" });
  return updated;
}

export async function incrementDigitalCardView(id: string) {
  await prisma.digitalBusinessCard.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });
}

export async function recordDigitalCardGuestOpen(input: {
  cardId: string;
  ownerUserId: string;
  viewerUserId?: string | null;
  userAgent?: string | null;
  isDemo?: boolean;
}) {
  const { shouldCountCeleYouGuestStat } = await import("@/lib/celeyou-share/events");
  if (
    !shouldCountCeleYouGuestStat({
      ownerUserId: input.ownerUserId,
      viewerUserId: input.viewerUserId,
      userAgent: input.userAgent,
      isDemo: input.isDemo,
    })
  ) {
    return false;
  }
  const { celeYouDeviceCategory } = await import("@/lib/digital-business-card/analytics");
  await incrementDigitalCardView(input.cardId);
  await recordSmartCardInteraction(input.cardId, "profile_open", {
    surface: "profile",
    attribution: "profile",
    outcome: "completed",
    device: celeYouDeviceCategory(input.userAgent || ""),
  });
  return true;
}

export async function recordSmartCardInteraction(cardId: string, kind: string, meta?: Record<string, unknown>) {
  await prisma.smartCardInteraction
    .create({
      data: { cardId, kind, meta: (meta ?? {}) as object },
    })
    .catch(() => undefined);
}

function sanitizeActivityMeta(meta: unknown) {
  return sanitizeCeleYouActivityMeta(meta);
}

type ActivityWindow = { from?: Date | null; to?: Date | null };

function createdAtWindow(input?: ActivityWindow) {
  if (!input?.from && !input?.to) return undefined;
  return {
    createdAt: {
      ...(input.from ? { gte: input.from } : {}),
      ...(input.to ? { lte: input.to } : {}),
    },
  };
}

export async function listDigitalCardActivityForUser(
  userId: string,
  cardId: string,
  input?: { cursor?: string | null; take?: number } & ActivityWindow
) {
  const card = await getDigitalCardForUser(userId, cardId);
  if (!card) return null;
  const take = Math.min(50, Math.max(1, input?.take ?? 20));
  const rows = await prisma.smartCardInteraction.findMany({
    where: { cardId, ...createdAtWindow(input) },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(input?.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
    select: { id: true, kind: true, createdAt: true, meta: true },
  });
  const hasMore = rows.length > take;
  const page = rows.slice(0, take);
  return {
    items: page.map((row) => ({
      id: row.id,
      kind: row.kind,
      createdAt: row.createdAt.toISOString(),
      meta: sanitizeActivityMeta(row.meta),
    })),
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
  };
}

export async function getDigitalCardAnalyticsForUser(
  userId: string,
  cardId: string,
  input?: { cursor?: string | null; take?: number } & ActivityWindow
) {
  const card = await getDigitalCardForUser(userId, cardId);
  if (!card) return null;
  const clamped =
    input?.from && input?.to ? clampAnalyticsRangeDays(input.from, input.to) : { from: input?.from, to: input?.to };
  const windowInput = { ...input, from: clamped.from, to: clamped.to };
  const when = createdAtWindow(windowInput);
  const ranged = Boolean(when);
  const activity = await listDigitalCardActivityForUser(userId, cardId, windowInput);
  if (input?.cursor) {
    return {
      viewCount: ranged ? 0 : card.viewCount,
      activity: activity?.items ?? [],
      nextCursor: activity?.nextCursor ?? null,
    };
  }
  const trendBounds = ranged
    ? { from: windowInput.from ?? undefined, to: windowInput.to ?? undefined }
    : celeYouTrendWindow();
  const [grouped, connectionCount, trendRows] = await Promise.all([
    prisma.smartCardInteraction.groupBy({
      by: ["kind"],
      where: { cardId, ...when },
      _count: { _all: true },
    }),
    prisma.smartCardConnection.count({
      where: { cardId, status: { not: "ARCHIVED" }, ...when },
    }),
    prisma.smartCardInteraction.findMany({
      where: {
        cardId,
        createdAt: {
          ...(trendBounds.from ? { gte: trendBounds.from } : {}),
          ...(trendBounds.to ? { lte: trendBounds.to } : {}),
        },
      },
      orderBy: { createdAt: "asc" },
      take: CELEYOU_ANALYTICS_TREND_MAX_ROWS,
      select: { kind: true, createdAt: true, meta: true },
    }),
  ]);
  const byKind: Record<string, number> = {};
  for (const row of grouped) {
    byKind[row.kind] = row._count._all;
  }
  const trendFrom = trendBounds.from ?? celeYouTrendWindow().from;
  const trendTo = trendBounds.to ?? new Date();
  return {
    viewCount: ranged ? byKind.profile_open ?? 0 : card.viewCount,
    qrOpens: byKind.qr_open ?? 0,
    nfcTaps: byKind.nfc_tap ?? 0,
    vcardSaves: byKind.vcard_save ?? 0,
    vcardDownloads: byKind.vcard_download ?? 0,
    callTaps: byKind.call_tap ?? 0,
    whatsappTaps: byKind.whatsapp_tap ?? 0,
    emailTaps: byKind.email_tap ?? 0,
    websiteTaps: byKind.website_tap ?? 0,
    socialTaps: byKind.social_tap ?? 0,
    locationTaps: byKind.location_tap ?? 0,
    meetingOpens: byKind.meeting_open ?? 0,
    meetingBooked: byKind.meeting_booked ?? 0,
    paymentOpens: byKind.payment_open ?? 0,
    shares: byKind.share_tap ?? 0,
    connects: connectionCount,
    reconnects: 0,
    byKind,
    popular: celeYouPopularLinks(byKind),
    devices: celeYouDeviceBreakdown(trendRows),
    trend: buildCeleYouTrendSeries(trendRows, trendFrom, trendTo),
    ranged,
    notes: {
      qr: CELEYOU_QR_ATTRIBUTION,
      nfc: CELEYOU_NFC_ATTRIBUTION,
      payment: CELEYOU_PAYMENT_ATTRIBUTION,
      share: CELEYOU_SHARE_ATTRIBUTION,
      contact: CELEYOU_CONTACT_ATTRIBUTION,
    },
    activity: activity?.items ?? [],
    nextCursor: activity?.nextCursor ?? null,
  };
}
