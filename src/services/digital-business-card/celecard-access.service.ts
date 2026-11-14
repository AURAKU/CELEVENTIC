import { prisma } from "@/lib/prisma";
import {
  celeCardGrantCookieName,
  hashCeleCardAccessCode,
  hashCeleCardGrantToken,
  hashesMatch,
  newGrantToken,
  normalizeAccessCode,
  protectReachItemKeys,
  readReachVisibilityMap,
  type ReachVisibility,
} from "@/lib/digital-business-card/privacy";
import { getDigitalCardForUser } from "@/services/digital-business-card/digital-business-card.service";
import { decrypt, encrypt } from "@/lib/encryption";

export const CELECARD_GRANT_MAX_AGE_SECONDS = 60 * 60 * 12;

function asItemKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is string => typeof value === "string" && value.length > 0 && value.length < 80);
}

function ownerCodeFromHint(hint: string | null | undefined): string | null {
  const raw = hint?.trim() || "";
  if (!raw) return null;
  try {
    const code = decrypt(raw);
    return normalizeAccessCode(code)?.code ?? null;
  } catch {
    return normalizeAccessCode(raw)?.code ?? null;
  }
}

export async function resolveCeleCardGrant(cardId: string, rawToken: string | null | undefined) {
  const token = rawToken?.trim() || "";
  if (!token) return null;
  const tokenHash = hashCeleCardGrantToken(token);
  const grant = await prisma.smartCardAccessGrant.findUnique({ where: { tokenHash } });
  if (!grant || grant.cardId !== cardId) return null;
  if (grant.revokedAt) return null;
  if (grant.expiresAt.getTime() < Date.now()) return null;
  return { id: grant.id, itemKeys: asItemKeys(grant.itemKeys), source: grant.source };
}

export async function createCeleCardAccessCode(input: {
  cardId: string;
  label: string;
  code: string;
  itemKeys: string[];
  expiresAt?: Date | null;
  maxRedemptions?: number | null;
}) {
  const normalized = normalizeAccessCode(input.code);
  if (!normalized) throw new Error("Use four digits or four letters");
  const itemKeys = [...new Set(input.itemKeys.filter(Boolean))].slice(0, 40);
  if (!itemKeys.length) throw new Error("Choose at least one protected detail");
  const created = await prisma.smartCardAccessCode.create({
    data: {
      cardId: input.cardId,
      label: input.label.trim().slice(0, 80) || "Access code",
      codeHash: hashCeleCardAccessCode(input.cardId, normalized.code),
      codeHint: encrypt(normalized.code),
      codeKind: normalized.kind,
      itemKeys,
      expiresAt: input.expiresAt ?? null,
      maxRedemptions: input.maxRedemptions ?? null,
    },
  });
  await persistReachVisibilityForCard(input.cardId, protectReachItemKeys(undefined, itemKeys), {
    merge: true,
  });
  return created;
}

export async function persistReachVisibilityForUser(
  userId: string,
  cardId: string,
  visibility: Record<string, ReachVisibility>
) {
  const card = await getDigitalCardForUser(userId, cardId);
  if (!card) return null;
  return persistReachVisibilityForCard(card.id, visibility, { merge: false });
}

async function persistReachVisibilityForCard(
  cardId: string,
  visibility: Record<string, ReachVisibility>,
  options?: { merge?: boolean }
) {
  const card = await prisma.digitalBusinessCard.findUnique({
    where: { id: cardId },
    select: { id: true, socials: true },
  });
  if (!card) return null;
  const raw =
    card.socials && typeof card.socials === "object" && !Array.isArray(card.socials)
      ? { ...(card.socials as Record<string, unknown>) }
      : {};
  const current = readReachVisibilityMap(raw);
  const next = options?.merge ? { ...current, ...visibility } : visibility;
  const cleaned: Record<string, ReachVisibility> = {};
  for (const [id, mode] of Object.entries(next)) {
    if (mode && mode !== "PUBLIC") cleaned[id] = mode;
  }
  if (Object.keys(cleaned).length) raw.reachVisibility = cleaned;
  else delete raw.reachVisibility;
  return prisma.digitalBusinessCard.update({
    where: { id: card.id },
    data: { socials: raw as object },
  });
}

export async function listCeleCardAccessCodes(cardId: string) {
  const rows = await prisma.smartCardAccessCode.findMany({
    where: { cardId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    code: ownerCodeFromHint(row.codeHint),
    codeKind: row.codeKind,
    itemKeys: asItemKeys(row.itemKeys),
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    maxRedemptions: row.maxRedemptions,
    redemptionCount: row.redemptionCount,
    createdAt: row.createdAt,
  }));
}

export async function revokeCeleCardAccessCode(cardId: string, codeId: string) {
  const existing = await prisma.smartCardAccessCode.findFirst({ where: { id: codeId, cardId } });
  if (!existing) return null;
  return prisma.smartCardAccessCode.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });
}

export async function unlockCeleCardWithCode(
  cardId: string,
  code: string,
  alreadyGranted: Iterable<string> = [],
  itemKey?: string | null
) {
  const normalized = normalizeAccessCode(code);
  if (!normalized) return { ok: false as const, reason: "invalid" };
  const hash = hashCeleCardAccessCode(cardId, normalized.code);
  const rows = await prisma.smartCardAccessCode.findMany({
    where: { cardId, revokedAt: null },
  });
  const match = rows.find((row) => hashesMatch(row.codeHash, hash));
  if (!match) {
    await prisma.smartCardInteraction
      .create({ data: { cardId, kind: "access_code_fail", meta: { kind: normalized.kind } } })
      .catch(() => undefined);
    return { ok: false as const, reason: "invalid" };
  }
  if (match.expiresAt && match.expiresAt.getTime() < Date.now()) {
    return { ok: false as const, reason: "expired" };
  }
  if (match.maxRedemptions != null && match.redemptionCount >= match.maxRedemptions) {
    return { ok: false as const, reason: "exhausted" };
  }
  const matchedKeys = asItemKeys(match.itemKeys);
  const wanted = itemKey?.trim() || "";
  if (wanted && !matchedKeys.includes(wanted)) {
    await prisma.smartCardInteraction
      .create({
        data: { cardId, kind: "access_code_fail", meta: { kind: normalized.kind, itemKey: wanted } },
      })
      .catch(() => undefined);
    return { ok: false as const, reason: "wrong-item" };
  }
  const itemKeys = [...new Set([...alreadyGranted, ...matchedKeys])].filter(Boolean);
  const issued = await issueCeleCardGrant({ cardId, itemKeys, source: "CODE" });
  await prisma.smartCardAccessCode.update({
    where: { id: match.id },
    data: { redemptionCount: { increment: 1 } },
  });
  await prisma.smartCardInteraction
    .create({ data: { cardId, kind: "access_code_ok", meta: { codeId: match.id } } })
    .catch(() => undefined);
  return { ok: true as const, ...issued, itemKeys };
}

export async function issueCeleCardGrant(input: {
  cardId: string;
  itemKeys: string[];
  source: "CODE" | "REQUEST";
}) {
  const token = newGrantToken();
  const expiresAt = new Date(Date.now() + CELECARD_GRANT_MAX_AGE_SECONDS * 1000);
  const grant = await prisma.smartCardAccessGrant.create({
    data: {
      cardId: input.cardId,
      tokenHash: hashCeleCardGrantToken(token),
      itemKeys: input.itemKeys,
      source: input.source,
      expiresAt,
    },
  });
  return {
    grantId: grant.id,
    token,
    cookieName: celeCardGrantCookieName(input.cardId),
    expiresAt,
    itemKeys: input.itemKeys,
  };
}

export async function createCeleCardAccessRequest(input: {
  cardId: string;
  itemKeys: string[];
  visitorName: string;
  visitorContact: string;
  message?: string | null;
}) {
  const name = input.visitorName.trim();
  const contact = input.visitorContact.trim();
  if (name.length < 2) throw new Error("Name is required");
  if (contact.length < 5) throw new Error("Email or phone is required");
  const itemKeys = [...new Set(input.itemKeys.filter(Boolean))].slice(0, 12);
  if (!itemKeys.length) throw new Error("Choose a detail to request");
  const request = await prisma.smartCardAccessRequest.create({
    data: {
      cardId: input.cardId,
      itemKeys,
      visitorName: name.slice(0, 120),
      visitorContact: contact.slice(0, 200),
      message: input.message?.trim().slice(0, 500) || null,
      status: "PENDING",
    },
  });
  await prisma.smartCardInteraction
    .create({ data: { cardId: input.cardId, kind: "access_request", meta: { requestId: request.id } } })
    .catch(() => undefined);
  return request;
}

export async function listCeleCardAccessRequests(cardId: string) {
  return prisma.smartCardAccessRequest.findMany({
    where: { cardId },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
}

export async function decideCeleCardAccessRequest(input: {
  cardId: string;
  requestId: string;
  decision: "approve" | "decline" | "revoke";
}) {
  const request = await prisma.smartCardAccessRequest.findFirst({
    where: { id: input.requestId, cardId: input.cardId },
  });
  if (!request) return null;
  if (input.decision === "decline") {
    return prisma.smartCardAccessRequest.update({
      where: { id: request.id },
      data: { status: "DECLINED" },
    });
  }
  if (input.decision === "revoke") {
    if (request.grantId) {
      await prisma.smartCardAccessGrant.update({
        where: { id: request.grantId },
        data: { revokedAt: new Date() },
      });
    }
    return prisma.smartCardAccessRequest.update({
      where: { id: request.id },
      data: { status: "REVOKED" },
    });
  }
  const issued = await issueCeleCardGrant({
    cardId: input.cardId,
    itemKeys: asItemKeys(request.itemKeys),
    source: "REQUEST",
  });
  const updated = await prisma.smartCardAccessRequest.update({
    where: { id: request.id },
    data: { status: "APPROVED", grantId: issued.grantId },
  });
  return { request: updated, token: issued.token, expiresAt: issued.expiresAt };
}

export function grantCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}
