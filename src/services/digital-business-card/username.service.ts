import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import {
  CELEYOU_USERNAME_HOLD_DAYS,
  celeYouUsernameHoldUntil,
  isReservedCeleYouUsername,
  normalizeCeleYouUsername,
  parseCeleYouUsername,
  suggestCeleYouUsernames,
  usernameAvailabilityMessage,
  type CeleYouUsernameReason,
  type CeleYouUsernameSeed,
} from "@/lib/digital-business-card/username";

export class CeleYouUsernameError extends Error {
  constructor(
    public readonly code: CeleYouUsernameReason | "UNAUTHORIZED" | "SUSPENDED" | "NOT_FOUND",
    message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = "CeleYouUsernameError";
  }
}

type Db = Prisma.TransactionClient | typeof prisma;

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function writeEvent(
  db: Db,
  input: {
    recordId?: string | null;
    userId?: string | null;
    actorId?: string | null;
    action: string;
    username: string;
    fromValue?: string | null;
    toValue?: string | null;
    reason?: string | null;
    ipAddress?: string | null;
  }
) {
  await db.celeYouUsernameEvent.create({
    data: {
      recordId: input.recordId ?? null,
      userId: input.userId ?? null,
      actorId: input.actorId ?? null,
      action: input.action,
      username: input.username,
      fromValue: input.fromValue ?? null,
      toValue: input.toValue ?? null,
      reason: input.reason ?? null,
      ipAddress: input.ipAddress ?? null,
    },
  });
}

export async function findUsernameRecord(normalized: string, db: Db = prisma) {
  return db.celeYouUsernameRecord.findUnique({ where: { normalized } });
}

function occupancyReason(
  record:
    | {
        kind?: string | null;
        holdUntil?: Date | null;
        userId?: string | null;
        updatedAt?: Date | null;
      }
    | null
    | undefined
): CeleYouUsernameReason {
  if (!record?.kind) return "AVAILABLE";
  if (record.kind === "RESERVED") return "RESERVED";
  const orphaned = (record.kind === "ACTIVE" || record.kind === "ALIAS") && !record.userId;
  if (record.kind === "HOLD" || orphaned) {
    const until =
      record.holdUntil ??
      (record.updatedAt
        ? new Date(record.updatedAt.getTime() + CELEYOU_USERNAME_HOLD_DAYS * 24 * 60 * 60 * 1000)
        : celeYouUsernameHoldUntil());
    if (until.getTime() > Date.now()) return "HOLD";
    return "AVAILABLE";
  }
  if (record.kind) return "TAKEN";
  return "AVAILABLE";
}

export async function checkCeleYouUsernameAvailability(input: {
  username: string;
  actorUserId?: string | null;
  seed?: CeleYouUsernameSeed;
}) {
  const parsed = parseCeleYouUsername(input.username);
  if (!parsed.ok) {
    return {
      username: normalizeCeleYouUsername(input.username),
      available: false as const,
      reason: "INVALID" as const,
      message: parsed.message,
      suggestions: [] as string[],
    };
  }
  if (isReservedCeleYouUsername(parsed.username)) {
    return {
      username: parsed.username,
      available: false as const,
      reason: "RESERVED" as const,
      message: usernameAvailabilityMessage("RESERVED"),
      suggestions: await buildSuggestions(input.seed, parsed.username, input.actorUserId),
    };
  }
  const record = await findUsernameRecord(parsed.username);
  const own =
    Boolean(input.actorUserId) &&
    record?.userId === input.actorUserId &&
    (record.kind === "ACTIVE" || record.kind === "SLUG");
  if (own) {
    return {
      username: parsed.username,
      available: true as const,
      reason: "AVAILABLE" as const,
      message: usernameAvailabilityMessage("AVAILABLE", parsed.username),
      suggestions: [] as string[],
    };
  }
  const reason = occupancyReason(record);
  const available = reason === "AVAILABLE";
  return {
    username: parsed.username,
    available,
    reason,
    message: usernameAvailabilityMessage(reason, parsed.username),
      suggestions: available
        ? []
        : await buildSuggestions(
            {
              displayName: input.seed?.displayName || parsed.username.replace(/[._]/g, " "),
              nickname: input.seed?.nickname,
              company: input.seed?.company,
              profession: input.seed?.profession,
              keywords: input.seed?.keywords,
            },
            parsed.username,
            input.actorUserId
          ),
  };
}

async function buildSuggestions(seed: CeleYouUsernameSeed | undefined, avoid: string, actorUserId?: string | null) {
  const taken = new Set<string>([avoid]);
  const candidates = suggestCeleYouUsernames(seed ?? {}, (value) => taken.has(value), 12);
  if (!candidates.length) return [];
  const rows = await prisma.celeYouUsernameRecord.findMany({
    where: { normalized: { in: candidates } },
    select: { normalized: true, kind: true, userId: true, holdUntil: true },
  });
  for (const row of rows) {
    const own = actorUserId && row.userId === actorUserId && (row.kind === "ACTIVE" || row.kind === "SLUG");
    if (own) continue;
    if (occupancyReason(row) !== "AVAILABLE") taken.add(row.normalized);
  }
  return suggestCeleYouUsernames(seed ?? {}, (value) => taken.has(value), 5);
}

async function assertUserMayManageUsername(userId: string, db: Db = prisma) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true, username: true, celeYouPrimaryCardId: true },
  });
  if (!user) throw new CeleYouUsernameError("NOT_FOUND", "Account not found.", 404);
  if (user.status === "SUSPENDED") {
    throw new CeleYouUsernameError("SUSPENDED", "This account cannot change its username.", 403);
  }
  return user;
}

export async function claimCeleYouUsername(input: {
  userId: string;
  username: string;
  actorId?: string | null;
  ipAddress?: string | null;
  seed?: CeleYouUsernameSeed;
  primaryCardId?: string | null;
}) {
  const parsed = parseCeleYouUsername(input.username);
  if (!parsed.ok) throw new CeleYouUsernameError("INVALID", parsed.message);
  if (isReservedCeleYouUsername(parsed.username)) {
    throw new CeleYouUsernameError("RESERVED", usernameAvailabilityMessage("RESERVED"));
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await assertUserMayManageUsername(input.userId, tx);
      let existing = await tx.celeYouUsernameRecord.findUnique({ where: { normalized: parsed.username } });
      if (existing && occupancyReason(existing) === "AVAILABLE") {
        await tx.celeYouUsernameRecord.delete({ where: { id: existing.id } });
        existing = null;
      }
      if (existing) {
        const own = existing.userId === input.userId && (existing.kind === "ACTIVE" || existing.kind === "SLUG");
        if (!own) {
          const reason = occupancyReason(existing);
          throw new CeleYouUsernameError(reason, usernameAvailabilityMessage(reason));
        }
        if (existing.kind === "ACTIVE" && user.username === parsed.username) {
          return { username: parsed.username, changed: false, recordId: existing.id };
        }
      }

      const current = await tx.celeYouUsernameRecord.findFirst({
        where: { userId: input.userId, kind: "ACTIVE" },
      });

      if (current && current.normalized !== parsed.username) {
        await tx.celeYouUsernameRecord.update({
          where: { id: current.id },
          data: {
            kind: "HOLD",
            redirectTo: parsed.username,
            holdUntil: celeYouUsernameHoldUntil(),
            reason: "username-change",
          },
        });
        await writeEvent(tx, {
          recordId: current.id,
          userId: input.userId,
          actorId: input.actorId ?? input.userId,
          action: "HOLD",
          username: current.normalized,
          fromValue: current.normalized,
          toValue: parsed.username,
          reason: "username-change",
          ipAddress: input.ipAddress,
        });
      }

      const primaryCardId = await resolveOwnedCardId(tx, input.userId, input.primaryCardId ?? user.celeYouPrimaryCardId);

      let recordId = existing?.id;
      if (existing) {
        await tx.celeYouUsernameRecord.update({
          where: { id: existing.id },
          data: {
            kind: "ACTIVE",
            userId: input.userId,
            cardId: primaryCardId,
            redirectTo: null,
            holdUntil: null,
            reason: "claimed",
          },
        });
      } else {
        const created = await tx.celeYouUsernameRecord.create({
          data: {
            normalized: parsed.username,
            kind: "ACTIVE",
            userId: input.userId,
            cardId: primaryCardId,
            reason: "claimed",
          },
        });
        recordId = created.id;
      }

      await tx.user.update({
        where: { id: input.userId },
        data: {
          username: parsed.username,
          ...(primaryCardId ? { celeYouPrimaryCardId: primaryCardId } : {}),
        },
      });

      await writeEvent(tx, {
        recordId,
        userId: input.userId,
        actorId: input.actorId ?? input.userId,
        action: current ? "CHANGE" : "CLAIM",
        username: parsed.username,
        fromValue: current?.normalized ?? user.username,
        toValue: parsed.username,
        ipAddress: input.ipAddress,
      });

      return { username: parsed.username, changed: current?.normalized !== parsed.username, recordId };
    });
  } catch (error) {
    if (error instanceof CeleYouUsernameError) throw error;
    if (isUniqueConflict(error)) {
      throw new CeleYouUsernameError("TAKEN", usernameAvailabilityMessage("TAKEN"));
    }
    throw error;
  }
}

async function resolveOwnedCardId(db: Db, userId: string, preferred?: string | null) {
  if (preferred) {
    const owned = await db.digitalBusinessCard.findFirst({
      where: { id: preferred, userId, deletedAt: null },
      select: { id: true },
    });
    if (owned) return owned.id;
  }
  const latest = await db.digitalBusinessCard.findFirst({
    where: { userId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  return latest?.id ?? null;
}

export async function setCeleYouPrimaryCard(userId: string, cardId: string) {
  const card = await prisma.digitalBusinessCard.findFirst({
    where: { id: cardId, userId, deletedAt: null },
    select: { id: true },
  });
  if (!card) throw new CeleYouUsernameError("NOT_FOUND", "That card is not on this account.", 404);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { celeYouPrimaryCardId: card.id } });
    await tx.celeYouUsernameRecord.updateMany({
      where: { userId, kind: "ACTIVE" },
      data: { cardId: card.id },
    });
    await writeEvent(tx, {
      userId,
      actorId: userId,
      action: "PRIMARY",
      username: "",
      toValue: card.id,
    });
  });
  return { primaryCardId: card.id };
}

export async function bridgeCardSlug(card: { id: string; userId: string; slug: string; previousSlug?: string | null }) {
  const stored = normalizeCeleYouUsername(card.slug);
  if (stored.length < 2) return;
  await prisma.$transaction(async (tx) => {
    for (const key of [stored]) {
      const existing = await tx.celeYouUsernameRecord.findUnique({ where: { normalized: key } });
      if (existing && existing.userId && existing.userId !== card.userId && existing.kind !== "SLUG") continue;
      if (existing) {
        if (existing.kind === "ACTIVE") continue;
        await tx.celeYouUsernameRecord.update({
          where: { id: existing.id },
          data: { kind: existing.kind === "HOLD" ? existing.kind : "SLUG", userId: card.userId, cardId: card.id },
        });
      } else {
        await tx.celeYouUsernameRecord.create({
          data: {
            normalized: key,
            kind: "SLUG",
            userId: card.userId,
            cardId: card.id,
            reason: "card-slug",
          },
        });
      }
    }
    if (card.previousSlug && card.previousSlug !== card.slug) {
      const previous = normalizeCeleYouUsername(card.previousSlug);
      const row = await tx.celeYouUsernameRecord.findUnique({ where: { normalized: previous } });
      if (row && row.cardId === card.id && row.kind === "SLUG") {
        await tx.celeYouUsernameRecord.update({
          where: { id: row.id },
          data: { kind: "ALIAS", redirectTo: stored, reason: "slug-change" },
        });
      }
    }
    const user = await tx.user.findUnique({ where: { id: card.userId }, select: { celeYouPrimaryCardId: true } });
    if (!user?.celeYouPrimaryCardId) {
      await tx.user.update({ where: { id: card.userId }, data: { celeYouPrimaryCardId: card.id } });
    }
  }).catch(() => undefined);
}

export async function getCeleYouAccountIdentity(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, username: true, celeYouPrimaryCardId: true, status: true },
  });
  if (!user) return null;
  const active = await prisma.celeYouUsernameRecord.findFirst({
    where: { userId, kind: "ACTIVE" },
  });
  const cards = await prisma.digitalBusinessCard.findMany({
    where: { userId, deletedAt: null },
    select: { id: true, slug: true, displayName: true, company: true, isPublished: true, publicToken: true },
    orderBy: { updatedAt: "desc" },
  });
  const primaryCardId =
    (user.celeYouPrimaryCardId && cards.some((card) => card.id === user.celeYouPrimaryCardId)
      ? user.celeYouPrimaryCardId
      : cards[0]?.id) ?? null;
  const username = active?.normalized ?? user.username ?? null;
  return {
    userId: user.id,
    displayName: user.name,
    username,
    publicPath: username ? `/u/${username}` : cards[0] ? `/u/${cards[0].slug}` : null,
    primaryCardId,
    needsUsername: !username,
    cards,
  };
}

export type CeleYouPublicHandle =
  | { kind: "missing" }
  | { kind: "alias"; redirectTo: string }
  | { kind: "card"; slug: string; cardId: string; username: string | null };

export async function resolveCeleYouPublicHandle(raw: string): Promise<CeleYouPublicHandle> {
  const handle = normalizeCeleYouUsername(decodeURIComponent(raw));
  if (!handle) return { kind: "missing" };

  const record = await prisma.celeYouUsernameRecord.findUnique({ where: { normalized: handle } });
  if (record?.kind === "ALIAS" && record.redirectTo) {
    return { kind: "alias", redirectTo: record.redirectTo };
  }
  if (record?.kind === "HOLD" && record.redirectTo) {
    return { kind: "alias", redirectTo: record.redirectTo };
  }
  if (record?.kind === "ACTIVE" && record.userId) {
    const slug = await primarySlugForUser(record.userId, record.cardId);
    if (slug) return { kind: "card", slug, cardId: record.cardId ?? "", username: record.normalized };
  }
  if (record?.kind === "SLUG" && record.cardId) {
    const card = await prisma.digitalBusinessCard.findUnique({
      where: { id: record.cardId },
      select: { slug: true, id: true, deletedAt: true, userId: true },
    });
    if (card && !card.deletedAt) {
      const active = await prisma.celeYouUsernameRecord.findFirst({
        where: { userId: card.userId, kind: "ACTIVE" },
        select: { normalized: true },
      });
      return { kind: "card", slug: card.slug, cardId: card.id, username: active?.normalized ?? null };
    }
  }

  const card = await prisma.digitalBusinessCard.findUnique({
    where: { slug: handle },
    select: { slug: true, id: true, deletedAt: true, userId: true },
  });
  if (card && !card.deletedAt) {
    const active = await prisma.celeYouUsernameRecord.findFirst({
      where: { userId: card.userId, kind: "ACTIVE" },
      select: { normalized: true },
    });
    return { kind: "card", slug: card.slug, cardId: card.id, username: active?.normalized ?? null };
  }
  return { kind: "missing" };
}

export async function resolveCeleYouCardSlug(raw: string): Promise<string | null> {
  const resolved = await resolveCeleYouPublicHandle(raw);
  if (resolved.kind === "card") return resolved.slug;
  if (resolved.kind === "alias") {
    const nested = await resolveCeleYouPublicHandle(resolved.redirectTo);
    if (nested.kind === "card") return nested.slug;
    if (nested.kind === "alias") {
      const third = await resolveCeleYouPublicHandle(nested.redirectTo);
      if (third.kind === "card") return third.slug;
    }
  }
  return null;
}

async function primarySlugForUser(userId: string, preferredCardId?: string | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { celeYouPrimaryCardId: true },
  });
  const ids = [preferredCardId, user?.celeYouPrimaryCardId].filter(Boolean) as string[];
  for (const id of ids) {
    const card = await prisma.digitalBusinessCard.findFirst({
      where: { id, userId, deletedAt: null },
      select: { slug: true },
    });
    if (card) return card.slug;
  }
  const latest = await prisma.digitalBusinessCard.findFirst({
    where: { userId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: { slug: true },
  });
  return latest?.slug ?? null;
}

export async function holdUsernamesForDeletedAccount(userId: string, actorId?: string | null) {
  const active = await prisma.celeYouUsernameRecord.findMany({
    where: { userId, kind: { in: ["ACTIVE", "ALIAS", "SLUG"] } },
  });
  await prisma.$transaction(async (tx) => {
    for (const row of active) {
      await tx.celeYouUsernameRecord.update({
        where: { id: row.id },
        data: {
          kind: "HOLD",
          holdUntil: celeYouUsernameHoldUntil(),
          redirectTo: null,
          reason: "account-deleted",
        },
      });
      await writeEvent(tx, {
        recordId: row.id,
        userId,
        actorId,
        action: "HOLD",
        username: row.normalized,
        reason: "account-deleted",
      });
    }
  });
}

export async function releaseExpiredUsernameHolds(now = new Date()) {
  const expired = await prisma.celeYouUsernameRecord.findMany({
    where: { kind: "HOLD", holdUntil: { lte: now } },
    take: 200,
  });
  for (const row of expired) {
    await prisma.celeYouUsernameRecord.delete({ where: { id: row.id } }).catch(() => undefined);
    await writeEvent(prisma, {
      userId: row.userId,
      action: "RELEASE",
      username: row.normalized,
      reason: "hold-expired",
    });
  }
  return expired.length;
}

export async function adminReserveUsername(input: {
  username: string;
  actorId: string;
  reason: string;
  ipAddress?: string | null;
}) {
  const parsed = parseCeleYouUsername(input.username);
  const normalized = parsed.ok ? parsed.username : normalizeCeleYouUsername(input.username);
  if (!normalized) throw new CeleYouUsernameError("INVALID", "Enter a username to reserve.");
  const reason = input.reason.trim();
  if (reason.length < 8) throw new CeleYouUsernameError("INVALID", "Write a reason of at least 8 characters.");
  const existing = await findUsernameRecord(normalized);
  if (existing && existing.kind !== "RESERVED") {
    throw new CeleYouUsernameError("TAKEN", "That username already belongs to an account.");
  }
  const row = existing
    ? await prisma.celeYouUsernameRecord.update({
        where: { id: existing.id },
        data: { kind: "RESERVED", userId: null, cardId: null, reason },
      })
    : await prisma.celeYouUsernameRecord.create({
        data: { normalized, kind: "RESERVED", reason },
      });
  await writeEvent(prisma, {
    recordId: row.id,
    actorId: input.actorId,
    action: "RESERVE",
    username: normalized,
    reason,
    ipAddress: input.ipAddress,
  });
  await createAuditLog({
    userId: input.actorId,
    action: "UPDATE",
    entity: "CeleYouUsername",
    entityId: row.id,
    details: { username: normalized, reason },
    ipAddress: input.ipAddress ?? undefined,
  });
  return row;
}

export async function listAdminUsernames(input: {
  search?: string | null;
  kind?: string | null;
  page?: string | null;
  limit?: string | null;
}) {
  const page = Math.max(1, Number(input.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(input.limit) || 20));
  const where: Prisma.CeleYouUsernameRecordWhereInput = {};
  const search = normalizeCeleYouUsername(input.search ?? "");
  if (search.length >= 2) where.normalized = { contains: search };
  if (input.kind && input.kind !== "all") where.kind = input.kind;
  const [total, rows] = await Promise.all([
    prisma.celeYouUsernameRecord.count({ where }),
    prisma.celeYouUsernameRecord.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, status: true } },
        card: { select: { id: true, slug: true, displayName: true } },
      },
    }),
  ]);
  return {
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
    rows: rows.map((row) => ({
      id: row.id,
      username: row.normalized,
      kind: row.kind,
      userId: row.userId,
      ownerName: row.user?.name ?? null,
      ownerEmail: row.user?.email ?? null,
      ownerStatus: row.user?.status ?? null,
      cardId: row.cardId,
      cardSlug: row.card?.slug ?? null,
      cardDisplayName: row.card?.displayName ?? null,
      redirectTo: row.redirectTo,
      holdUntil: row.holdUntil,
      reason: row.reason,
      updatedAt: row.updatedAt,
    })),
  };
}

export async function listUsernameHistory(username: string, limit = 40) {
  const normalized = normalizeCeleYouUsername(username);
  return prisma.celeYouUsernameEvent.findMany({
    where: { username: normalized },
    orderBy: { createdAt: "desc" },
    take: Math.min(100, Math.max(1, limit)),
    select: {
      id: true,
      action: true,
      username: true,
      fromValue: true,
      toValue: true,
      reason: true,
      actorId: true,
      createdAt: true,
    },
  });
}
