import { prisma } from "@/lib/prisma";
import {
  DEFAULT_CELECARD_LIFECYCLE_POLICY,
  type CeleCardLifecyclePolicy,
} from "@/lib/digital-business-card/lifecycle";
import {
  defaultDesignLabel,
  designConfigFromCard,
  identityFromCard,
  parseDesignConfig,
} from "@/lib/digital-business-card/design-vault";
import { resolveDigitalCardTheme } from "@/lib/digital-business-card/themes";
import { getDigitalCardForUser, recordCeleCardLifecycleEvent } from "./digital-business-card.service";

const VAULT_PAGE = 12;

export async function listDesignVersions(
  userId: string,
  cardId: string,
  page = 1,
  policy: Pick<CeleCardLifecyclePolicy, "designVaultMax"> = DEFAULT_CELECARD_LIFECYCLE_POLICY
) {
  const card = await getDigitalCardForUser(userId, cardId);
  if (!card) return null;
  const take = VAULT_PAGE;
  const skip = Math.max(0, (page - 1) * take);
  const where = { cardId, archivedAt: null };
  const [items, total] = await Promise.all([
    prisma.smartCardDesignVersion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.smartCardDesignVersion.count({ where }),
  ]);
  return {
    card: identityFromCard(card),
    currentThemeId: card.themeId,
    slug: card.slug,
    publicToken: card.publicToken,
    items: items.slice(0, policy.designVaultMax).map((row) => ({
      id: row.id,
      label: row.label,
      themeId: row.themeId,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    page,
    pageSize: take,
    total,
  };
}

export async function saveDesignVersion(userId: string, cardId: string, label?: string) {
  const card = await getDigitalCardForUser(userId, cardId);
  if (!card) return null;
  const config = designConfigFromCard(card);
  const row = await prisma.smartCardDesignVersion.create({
    data: {
      cardId,
      label: (label?.trim() || defaultDesignLabel(card.themeId)).slice(0, 80),
      themeId: config.themeId,
      config,
      status: "SAVED",
    },
  });
  await recordCeleCardLifecycleEvent({ cardId, kind: "DesignPublished", meta: { versionId: row.id } });
  return row;
}

export async function duplicateDesignVersion(userId: string, cardId: string, versionId: string) {
  const card = await getDigitalCardForUser(userId, cardId);
  if (!card) return null;
  const source = await prisma.smartCardDesignVersion.findFirst({
    where: { id: versionId, cardId },
  });
  if (!source) return null;
  const config = parseDesignConfig(source.config, source.themeId);
  const row = await prisma.smartCardDesignVersion.create({
    data: {
      cardId,
      label: `${source.label} copy`.slice(0, 80),
      themeId: config.themeId,
      config,
      status: "SAVED",
    },
  });
  await recordCeleCardLifecycleEvent({
    cardId,
    kind: "DesignDuplicated",
    meta: { sourceId: source.id, versionId: row.id },
  });
  return { version: row, identity: identityFromCard(card), slug: card.slug, publicToken: card.publicToken };
}

export async function restoreDesignVersion(userId: string, cardId: string, versionId: string) {
  const card = await getDigitalCardForUser(userId, cardId);
  if (!card) return null;
  const source = await prisma.smartCardDesignVersion.findFirst({
    where: { id: versionId, cardId, archivedAt: null },
  });
  if (!source) return null;
  const identity = identityFromCard(card);
  const config = parseDesignConfig(source.config, source.themeId);
  const theme = resolveDigitalCardTheme(config.themeId);
  const updated = await prisma.digitalBusinessCard.update({
    where: { id: cardId },
    data: {
      themeId: theme.id,
      publishedDesignVersionId: source.id,
    },
  });
  await prisma.smartCardDesignVersion.update({
    where: { id: source.id },
    data: { status: "PUBLISHED" },
  });
  await recordCeleCardLifecycleEvent({
    cardId,
    kind: "DesignRestored",
    meta: { versionId: source.id, themeId: theme.id },
  });
  return {
    card: updated,
    identity,
    slugUnchanged: updated.slug === card.slug,
    tokenUnchanged: updated.publicToken === card.publicToken,
    identityUnchanged:
      identity.displayName === updated.displayName &&
      identity.email === updated.email &&
      identity.phone === updated.phone,
  };
}

export async function renameDesignVersion(
  userId: string,
  cardId: string,
  versionId: string,
  label: string
) {
  const card = await getDigitalCardForUser(userId, cardId);
  if (!card) return null;
  const next = label.trim().slice(0, 80);
  if (next.length < 2) return null;
  const updated = await prisma.smartCardDesignVersion.updateMany({
    where: { id: versionId, cardId },
    data: { label: next },
  });
  return updated.count > 0;
}

export async function archiveDesignVersion(userId: string, cardId: string, versionId: string) {
  const card = await getDigitalCardForUser(userId, cardId);
  if (!card) return null;
  const existing = await prisma.smartCardDesignVersion.findFirst({
    where: { id: versionId, cardId, archivedAt: null },
    select: { id: true },
  });
  if (!existing) return null;
  await prisma.$transaction(async (tx) => {
    await tx.smartCardDesignVersion.update({
      where: { id: versionId },
      data: { archivedAt: new Date(), status: "ARCHIVED" },
    });
    if (card.publishedDesignVersionId === versionId) {
      await tx.digitalBusinessCard.update({
        where: { id: cardId },
        data: { publishedDesignVersionId: null },
      });
    }
  });
  await recordCeleCardLifecycleEvent({
    cardId,
    kind: "DesignArchived",
    meta: { versionId },
  });
  return true;
}
