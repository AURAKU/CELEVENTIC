import { readFile } from "fs/promises";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUploadRoot } from "@/lib/uploads/file-storage";
import { decimalToMinorUnits, GIFT_DEFAULT_CURRENCY } from "@/lib/gifts/money";

export type PromoTxClient = Prisma.TransactionClient | typeof prisma;

export interface TicketPromoRecord {
  id: string;
  eventId: string;
  code: string;
  discountPercent: number;
  discountFixed?: number;
  discountFixedMinor?: number | null;
  maxUses?: number | null;
  maxUsesPerUser?: number | null;
  usedCount: number;
  active: boolean;
  startsAt?: string;
  expiresAt?: string;
  createdAt: string;
}

function promosDir() {
  return path.join(getUploadRoot(), "ticket-promos");
}

function promosFile(eventId: string) {
  return path.join(promosDir(), `${eventId}.json`);
}

async function readLegacyPromos(eventId: string): Promise<TicketPromoRecord[]> {
  try {
    const raw = await readFile(promosFile(eventId), "utf8");
    return JSON.parse(raw) as TicketPromoRecord[];
  } catch {
    return [];
  }
}

function toRecord(row: {
  id: string;
  eventId: string;
  code: string;
  discountPercent: number;
  discountFixedMinor: number | null;
  maxUses: number | null;
  maxUsesPerUser: number | null;
  usedCount: number;
  active: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}): TicketPromoRecord {
  return {
    id: row.id,
    eventId: row.eventId,
    code: row.code,
    discountPercent: row.discountPercent,
    discountFixedMinor: row.discountFixedMinor,
    discountFixed:
      row.discountFixedMinor != null ? row.discountFixedMinor / 100 : undefined,
    maxUses: row.maxUses,
    maxUsesPerUser: row.maxUsesPerUser,
    usedCount: row.usedCount,
    active: row.active,
    startsAt: row.startsAt?.toISOString(),
    expiresAt: row.expiresAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function isCurrentlyValid(promo: {
  active: boolean;
  startsAt?: Date | string | null;
  expiresAt?: Date | string | null;
  maxUses?: number | null;
  usedCount: number;
}): boolean {
  if (!promo.active) return false;
  const now = Date.now();
  if (promo.startsAt && new Date(promo.startsAt).getTime() > now) return false;
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() < now) return false;
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) return false;
  return true;
}

export async function listTicketPromos(eventId: string) {
  const rows = await prisma.ticketPromo.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
  });
  if (rows.length > 0) return rows.map(toRecord);

  const legacy = await readLegacyPromos(eventId);
  for (const promo of legacy) {
    try {
      await prisma.ticketPromo.create({
        data: {
          id: promo.id.startsWith("promo-") ? undefined : promo.id,
          eventId,
          code: promo.code.trim().toUpperCase(),
          discountPercent: promo.discountPercent ?? 0,
          discountFixedMinor:
            promo.discountFixedMinor ??
            (promo.discountFixed && promo.discountFixed > 0
              ? decimalToMinorUnits(promo.discountFixed, GIFT_DEFAULT_CURRENCY)
              : null),
          maxUses: promo.maxUses,
          usedCount: promo.usedCount,
          active: promo.active,
          expiresAt: promo.expiresAt ? new Date(promo.expiresAt) : null,
        },
      });
    } catch {
      // Unique races during import are fine; the row already exists.
    }
  }
  const imported = await prisma.ticketPromo.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
  });
  return imported.map(toRecord);
}

export async function createTicketPromo(
  eventId: string,
  input: {
    code: string;
    discountPercent?: number;
    discountFixed?: number;
    maxUses?: number;
    maxUsesPerUser?: number;
    startsAt?: string;
    expiresAt?: string;
  }
) {
  const code = input.code.trim().toUpperCase();
  const discountPercent = input.discountPercent ?? 0;
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error("Discount percent must be between 0 and 100");
  }
  let discountFixedMinor: number | null = null;
  if (input.discountFixed && input.discountFixed > 0) {
    discountFixedMinor = decimalToMinorUnits(input.discountFixed, GIFT_DEFAULT_CURRENCY);
  }

  try {
    const created = await prisma.ticketPromo.create({
      data: {
        eventId,
        code,
        discountPercent,
        discountFixedMinor,
        maxUses: input.maxUses,
        maxUsesPerUser: input.maxUsesPerUser,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });
    return toRecord(created);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Promo code already exists");
    }
    throw error;
  }
}

export async function deleteTicketPromo(eventId: string, promoId: string) {
  const result = await prisma.ticketPromo.deleteMany({
    where: { id: promoId, eventId },
  });
  if (result.count === 0) throw new Error("Promo not found");
}

export async function validateTicketPromo(
  eventId: string,
  code: string,
  client: PromoTxClient = prisma
) {
  const promo = await client.ticketPromo.findUnique({
    where: { eventId_code: { eventId, code: code.trim().toUpperCase() } },
  });
  if (!promo || !isCurrentlyValid(promo)) return null;
  return toRecord(promo);
}

export async function incrementPromoUse(
  eventId: string,
  code: string,
  client: PromoTxClient = prisma,
  opts?: { userId?: string | null; orderId?: string | null }
) {
  const promo = await client.ticketPromo.findUnique({
    where: { eventId_code: { eventId, code: code.trim().toUpperCase() } },
  });
  if (!promo) return { applied: false as const };

  if (!isCurrentlyValid(promo)) {
    throw new Error("Promo code is no longer valid");
  }

  if (promo.maxUsesPerUser && opts?.userId) {
    const usedByUser = await client.ticketPromoRedemption.count({
      where: { promoId: promo.id, userId: opts.userId },
    });
    if (usedByUser >= promo.maxUsesPerUser) {
      throw new Error("This promo code has already been used the maximum times for this buyer");
    }
  }

  if (promo.maxUses != null) {
    const claimed = await client.ticketPromo.updateMany({
      where: { id: promo.id, usedCount: { lt: promo.maxUses } },
      data: { usedCount: { increment: 1 } },
    });
    if (claimed.count === 0) {
      throw new Error("Promo code has reached its usage limit");
    }
  } else {
    await client.ticketPromo.update({
      where: { id: promo.id },
      data: { usedCount: { increment: 1 } },
    });
  }

  if (opts?.orderId) {
    try {
      await client.ticketPromoRedemption.create({
        data: {
          promoId: promo.id,
          eventId,
          orderId: opts.orderId,
          userId: opts.userId ?? null,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return { applied: true as const, alreadyRedeemed: true as const };
      }
      throw error;
    }
  }

  return { applied: true as const };
}

export function applyPromoDiscountMinor(
  amountMinor: number,
  promo: Pick<TicketPromoRecord, "discountPercent" | "discountFixed" | "discountFixedMinor">
): number {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new Error("Payable amount must be a non-negative integer in minor units");
  }
  const fixedMinor =
    promo.discountFixedMinor ??
    (promo.discountFixed && promo.discountFixed > 0
      ? decimalToMinorUnits(promo.discountFixed, GIFT_DEFAULT_CURRENCY)
      : 0);
  let payable = amountMinor;
  if (fixedMinor > 0) {
    payable = amountMinor - fixedMinor;
  } else if (promo.discountPercent > 0) {
    const discount = Math.round((amountMinor * promo.discountPercent) / 100);
    payable = amountMinor - discount;
  }
  return Math.max(0, payable);
}

/** @deprecated Display/API helper. Pricing maths must use applyPromoDiscountMinor. */
export function applyPromoDiscount(amount: number, promo: TicketPromoRecord): number {
  const amountMinor = decimalToMinorUnits(amount, GIFT_DEFAULT_CURRENCY);
  return applyPromoDiscountMinor(amountMinor, promo) / 100;
}

/** Test helper: compare-and-swap used by concurrency tests. */
export function canRedeemPromo(usedCount: number, maxUses: number | null | undefined): boolean {
  if (maxUses == null) return true;
  return usedCount < maxUses;
}
