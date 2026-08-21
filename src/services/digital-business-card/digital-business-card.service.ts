import { prisma } from "@/lib/prisma";
import {
  DIGITAL_CARD_TRIAL_DAYS,
  normalizeSocials,
  type DigitalCardPublicPayload,
  type DigitalCardSocials,
  type DigitalCardSubscriptionStatus,
} from "@/lib/digital-business-card/types";
import { resolveDigitalCardTheme, type DigitalCardThemeId } from "@/lib/digital-business-card/themes";

function slugifyBase(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function allocateDigitalCardSlug(preferred: string, excludeId?: string): Promise<string> {
  const base = slugifyBase(preferred) || "card";
  let candidate = base;
  let n = 0;
  while (true) {
    const existing = await prisma.digitalBusinessCard.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

export function isDigitalCardLive(card: {
  isPublished: boolean;
  subscriptionStatus: string;
  subscriptionExpiresAt: Date | null;
}): boolean {
  if (!card.isPublished) return false;
  if (card.subscriptionStatus === "INACTIVE" || card.subscriptionStatus === "EXPIRED") return false;
  if (card.subscriptionExpiresAt && card.subscriptionExpiresAt.getTime() < Date.now()) return false;
  return card.subscriptionStatus === "TRIAL" || card.subscriptionStatus === "ACTIVE";
}

export function toPublicPayload(card: {
  slug: string;
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
  isPublished: boolean;
  subscriptionStatus: string;
  subscriptionExpiresAt: Date | null;
}): DigitalCardPublicPayload {
  const theme = resolveDigitalCardTheme(card.themeId);
  return {
    slug: card.slug,
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
    nfcEnabled: card.nfcEnabled,
    isLive: isDigitalCardLive(card),
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

export async function listDigitalCardsForUser(userId: string) {
  return prisma.digitalBusinessCard.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getDigitalCardBySlug(slug: string) {
  return prisma.digitalBusinessCard.findUnique({ where: { slug } });
}

export async function getDigitalCardForUser(userId: string, id: string) {
  return prisma.digitalBusinessCard.findFirst({ where: { id, userId } });
}

export async function createDigitalCard(userId: string, input: UpsertDigitalCardInput) {
  const displayName = (input.displayName ?? "").trim();
  if (displayName.length < 2) {
    throw new Error("displayName required");
  }
  const theme = resolveDigitalCardTheme(input.themeId);
  const slug = await allocateDigitalCardSlug(input.slug || displayName);
  return prisma.digitalBusinessCard.create({
    data: {
      userId,
      slug,
      displayName,
      title: input.title?.trim() || null,
      company: input.company?.trim() || null,
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
}

export async function updateDigitalCard(userId: string, id: string, input: UpsertDigitalCardInput) {
  const existing = await getDigitalCardForUser(userId, id);
  if (!existing) return null;
  const theme = resolveDigitalCardTheme(input.themeId ?? existing.themeId);
  let slug = existing.slug;
  if (input.slug && input.slug !== existing.slug) {
    slug = await allocateDigitalCardSlug(input.slug, existing.id);
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
      themeId: theme.id,
      avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl || null : undefined,
      isPublished: input.isPublished !== undefined ? input.isPublished : undefined,
      nfcEnabled: input.nfcEnabled !== undefined ? input.nfcEnabled : undefined,
    },
  });
}

/** Soft renew for billing hooks — marks ACTIVE for +30 days. */
export async function renewDigitalCardSubscription(
  userId: string,
  id: string,
  status: DigitalCardSubscriptionStatus = "ACTIVE",
  days = 30
) {
  const existing = await getDigitalCardForUser(userId, id);
  if (!existing) return null;
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  return prisma.digitalBusinessCard.update({
    where: { id },
    data: { subscriptionStatus: status, subscriptionExpiresAt: expires },
  });
}

export async function incrementDigitalCardView(id: string) {
  await prisma.digitalBusinessCard.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });
}
