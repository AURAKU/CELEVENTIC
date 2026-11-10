import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DIGITAL_CARD_TRIAL_DAYS,
  normalizeSocials,
  type DigitalCardPublicPayload,
  type DigitalCardSocials,
} from "@/lib/digital-business-card/types";
import { resolveDigitalCardTheme, type DigitalCardThemeId } from "@/lib/digital-business-card/themes";
import {
  isCeleCardFullyPublic,
  renewalBaseDate,
  resolveCeleCardLifecycle,
  type CeleCardLifecycleInput,
} from "@/lib/digital-business-card/lifecycle";
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

export function isDigitalCardLive(card: CeleCardLifecycleInput, now = new Date()): boolean {
  return isCeleCardFullyPublic(resolveCeleCardLifecycle(card, now));
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
}): DigitalCardPublicPayload {
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
    isLive: isDigitalCardLive(card),
    presentationMode: isDigitalCardLive(card) ? "live" : "unavailable",
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

export async function resolveNfcDeviceTap(publicToken: string) {
  const device = await prisma.smartCardNfcDevice.findUnique({
    where: { publicToken },
    include: { card: true },
  });
  if (!device || device.status !== "ACTIVE") return null;
  if (!isDigitalCardLive(device.card)) return device.card;
  await prisma.smartCardNfcDevice.update({
    where: { id: device.id },
    data: { tapCount: { increment: 1 }, lastTapAt: new Date() },
  });
  await prisma.smartCardInteraction
    .create({
      data: {
        cardId: device.cardId,
        campaignId: device.campaignId,
        kind: "nfc_tap",
        meta: { deviceId: device.id, deviceType: device.deviceType },
      },
    })
    .catch(() => undefined);
  return device.card;
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
  campaignId?: string | null;
  eventId?: string | null;
}) {
  const name = input.visitorName.trim();
  if (name.length < 2) throw new Error("Name is required");
  const email = input.visitorEmail?.trim() || null;
  const phone = input.visitorPhone?.trim() || null;
  if (!email && !phone) throw new Error("Email or phone is required");

  const connection = await prisma.smartCardConnection.create({
    data: {
      cardId: input.cardId,
      visitorName: name,
      visitorEmail: email,
      visitorPhone: phone,
      visitorCompany: input.visitorCompany?.trim() || null,
      visitorTitle: input.visitorTitle?.trim() || null,
      note: input.note?.trim() || null,
      formMode: input.formMode || "Instant",
      campaignId: input.campaignId || null,
      eventId: input.eventId || null,
      status: "NEW",
      source: "connect_back",
      consentAt: new Date(),
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

export async function createDigitalCard(userId: string, input: UpsertDigitalCardInput) {
  const displayName = (input.displayName ?? "").trim();
  if (displayName.length < 2) {
    throw new Error("displayName required");
  }
  const theme = resolveDigitalCardTheme(input.themeId);
  const slugSeed = {
    displayName,
    company: input.company?.trim() || null,
    title: input.title?.trim() || null,
  };
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
          bio: input.bio?.trim() || null,
          email: input.email?.trim() || null,
          phone: input.phone?.trim() || null,
          website: input.website?.trim() || null,
          socials: (input.socials ?? {}) as object,
          themeId: theme.id,
          avatarUrl: input.avatarUrl || null,
          isPublished: input.isPublished ?? true,
          nfcEnabled: input.nfcEnabled ?? true,
          subscriptionStatus: "TRIAL",
          subscriptionExpiresAt: trialExpiryFromNow(),
        },
      });
      break;
    } catch (error) {
      if (!isSlugConflict(error) || attempt === 3) throw error;
    }
  }
  if (!created) throw new Error("Could not allocate a unique public link");
  await recordCeleCardLifecycleEvent({ cardId: created.id, kind: "CardCreated" });
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
  return prisma.digitalBusinessCard.update({
    where: { id: existing.id },
    data: {
      slug,
      displayName:
        input.displayName !== undefined ? input.displayName.trim() : undefined,
      title: input.title !== undefined ? input.title?.trim() || null : undefined,
      company: input.company !== undefined ? input.company?.trim() || null : undefined,
      bio: input.bio !== undefined ? input.bio?.trim() || null : undefined,
      email: input.email !== undefined ? input.email?.trim() || null : undefined,
      phone: input.phone !== undefined ? input.phone?.trim() || null : undefined,
      website: input.website !== undefined ? input.website?.trim() || null : undefined,
      socials: input.socials !== undefined ? (input.socials as object) : undefined,
      themeId: nextTheme,
      avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl || null : undefined,
      isPublished: input.isPublished !== undefined ? input.isPublished : undefined,
      nfcEnabled: input.nfcEnabled !== undefined ? input.nfcEnabled : undefined,
    },
  });
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
  const wasLive = isDigitalCardLive(existing);
  const base = renewalBaseDate(existing);
  const expires = smartCardExpiryFromNow(months, base);
  const updated = await prisma.digitalBusinessCard.update({
    where: { id: existing.id },
    data: {
      subscriptionStatus: "ACTIVE",
      subscriptionExpiresAt: expires,
      isPublished: true,
      lastActivatedAt: new Date(),
      lastActivationPaymentId: input.paymentId || existing.lastActivationPaymentId,
      lastCourtesyAt: null,
    },
  });
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
  return updated;
}

/** Admin / test bypass. Still requires an authenticated platform admin at the route. */
export async function activateDigitalCardPlan(userId: string, id: string, planId: string) {
  const { getSmartCardPlan, smartCardExpiryFromNow } = await import("@/lib/digital-business-card/plans");
  const plan = getSmartCardPlan(planId);
  if (!plan) return null;
  const existing = await getDigitalCardForUser(userId, id);
  if (!existing) return null;
  if (existing.deletedAt || existing.adminSuspendedAt) return null;
  const wasLive = isDigitalCardLive(existing);
  const base = renewalBaseDate(existing);
  const updated = await prisma.digitalBusinessCard.update({
    where: { id: existing.id },
    data: {
      subscriptionStatus: "ACTIVE",
      subscriptionExpiresAt: smartCardExpiryFromNow(plan.months, base),
      isPublished: true,
      lastActivatedAt: new Date(),
      lastCourtesyAt: null,
    },
  });
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

export async function recordSmartCardInteraction(cardId: string, kind: string, meta?: Record<string, unknown>) {
  await prisma.smartCardInteraction
    .create({
      data: { cardId, kind, meta: (meta ?? {}) as object },
    })
    .catch(() => undefined);
}

export async function getDigitalCardAnalyticsForUser(userId: string, cardId: string) {
  const card = await getDigitalCardForUser(userId, cardId);
  if (!card) return null;
  const grouped = await prisma.smartCardInteraction.groupBy({
    by: ["kind"],
    where: { cardId },
    _count: { _all: true },
  });
  const byKind: Record<string, number> = {};
  for (const row of grouped) {
    byKind[row.kind] = row._count._all;
  }
  return {
    viewCount: card.viewCount,
    qrOpens: byKind.qr_open ?? 0,
    nfcTaps: byKind.nfc_tap ?? 0,
    connects: byKind.connect ?? 0,
    reconnects: byKind.courtesy_reconnect ?? 0,
    byKind,
  };
}
