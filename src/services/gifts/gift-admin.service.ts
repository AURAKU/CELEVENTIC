import type { EventGiftPaymentStatus, EventGiftType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";
import { formatMinor, toMajorUnits } from "@/lib/gifts/money";
import { GIFT_TYPE_LABELS } from "@/lib/gifts/gift-copy";
import { displayGiftGuestName } from "@/lib/gifts/gift-privacy";
import { GIFT_PAYMENT_METHODS } from "@/lib/gifts/gift-providers";

/**
 * Organiser-side reporting over gift payments.
 *
 * Everything here is behind an event permission check performed by the caller —
 * these queries deliberately return contributor identities and amounts, which
 * is exactly the data that must never reach a guest surface.
 */

export interface GiftTransactionFilters {
  eventId: string;
  status?: EventGiftPaymentStatus | "ALL";
  giftType?: EventGiftType | "ALL";
  method?: string | "ALL";
  search?: string | null;
  from?: string | null;
  to?: string | null;
  page?: number | string | null;
  limit?: number | string | null;
}

export interface GiftTransactionRow {
  id: string;
  reference: string;
  status: EventGiftPaymentStatus;
  giftTypeLabel: string;
  amountMinor: number;
  amountFormatted: string;
  netAmountMinor: number;
  feeMinor: number;
  currency: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  guestMessage: string | null;
  isAnonymous: boolean;
  method: string | null;
  channel: string;
  createdAt: string;
  paidAt: string | null;
  reconciledAt: string | null;
  organiserNote: string | null;
  refundedAt: string | null;
  refundReason: string | null;
  hasReceipt: boolean;
}

const METHOD_LABELS = new Map(GIFT_PAYMENT_METHODS.map((m) => [m.id, m.label]));

function buildWhere(filters: GiftTransactionFilters): Prisma.EventGiftPaymentWhereInput {
  const where: Prisma.EventGiftPaymentWhereInput = { eventId: filters.eventId };

  if (filters.status && filters.status !== "ALL") where.status = filters.status;
  if (filters.giftType && filters.giftType !== "ALL") where.giftType = filters.giftType;

  const search = filters.search?.trim();
  if (search) {
    where.OR = [
      { reference: { contains: search } },
      { guestName: { contains: search } },
      { guestEmail: { contains: search } },
      { guestPhone: { contains: search } },
    ];
  }

  const createdAt: Prisma.DateTimeFilter = {};
  if (filters.from) {
    const from = new Date(filters.from);
    if (!Number.isNaN(from.getTime())) createdAt.gte = from;
  }
  if (filters.to) {
    const to = new Date(filters.to);
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      createdAt.lte = to;
    }
  }
  if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;

  return where;
}

/** Method lives in metadata JSON, which SQLite cannot filter on — do it in memory. */
function matchesMethod(metadata: unknown, method?: string | "ALL"): boolean {
  if (!method || method === "ALL") return true;
  return (metadata as { method?: string } | null)?.method === method;
}

export class GiftAdminService {
  async listTransactions(filters: GiftTransactionFilters) {
    const { page, limit, skip } = parsePaginationInput(
      { page: filters.page, limit: filters.limit },
      { limit: 20, maxLimit: 100 }
    );
    const where = buildWhere(filters);
    const filteringByMethod = Boolean(filters.method && filters.method !== "ALL");

    if (filteringByMethod) {
      const all = await prisma.eventGiftPayment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { receipt: { select: { id: true } } },
      });
      const matched = all.filter((gift) => matchesMethod(gift.metadata, filters.method));
      const slice = matched.slice(skip, skip + limit);
      return paginatedResult(slice.map(toRow), matched.length, page, limit);
    }

    const [items, total] = await Promise.all([
      prisma.eventGiftPayment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { receipt: { select: { id: true } } },
      }),
      prisma.eventGiftPayment.count({ where }),
    ]);

    return paginatedResult(items.map(toRow), total, page, limit);
  }

  async summary(eventId: string) {
    const [success, pending, failed, refunded, latest] = await Promise.all([
      prisma.eventGiftPayment.aggregate({
        where: { eventId, status: "SUCCESS" },
        _sum: { amountMinor: true, netAmountMinor: true, feeMinor: true },
        _count: true,
      }),
      prisma.eventGiftPayment.count({
        where: { eventId, status: { in: ["PENDING", "PROCESSING"] } },
      }),
      prisma.eventGiftPayment.count({
        where: { eventId, status: { in: ["FAILED", "ABANDONED"] } },
      }),
      prisma.eventGiftPayment.aggregate({
        where: { eventId, status: { in: ["REFUNDED", "REVERSED"] } },
        _sum: { amountMinor: true },
        _count: true,
      }),
      prisma.eventGiftPayment.findFirst({
        where: { eventId, status: "SUCCESS" },
        orderBy: { paidAt: "desc" },
        select: { paidAt: true, amountMinor: true, currency: true },
      }),
    ]);

    const grossMinor = success._sum.amountMinor ?? 0;
    const count = success._count;

    return {
      giftCount: count,
      grossMinor,
      netMinor: success._sum.netAmountMinor ?? 0,
      feesMinor: success._sum.feeMinor ?? 0,
      averageMinor: count > 0 ? Math.round(grossMinor / count) : 0,
      pendingCount: pending,
      failedCount: failed,
      refundedMinor: refunded._sum.amountMinor ?? 0,
      refundedCount: refunded._count,
      lastGiftAt: latest?.paidAt ? latest.paidAt.toISOString() : null,
      lastGiftMinor: latest?.amountMinor ?? null,
    };
  }

  /** Daily gift totals for the organiser chart — organiser-only aggregates. */
  async dailySeries(eventId: string, days = 30) {
    const since = new Date(Date.now() - days * 86_400_000);
    const rows = await prisma.eventGiftPayment.findMany({
      where: { eventId, status: "SUCCESS", paidAt: { gte: since } },
      select: { paidAt: true, amountMinor: true },
      orderBy: { paidAt: "asc" },
    });

    const buckets = new Map<string, { amountMinor: number; count: number }>();
    for (const row of rows) {
      const key = (row.paidAt ?? new Date()).toISOString().slice(0, 10);
      const bucket = buckets.get(key) ?? { amountMinor: 0, count: 0 };
      bucket.amountMinor += row.amountMinor;
      bucket.count += 1;
      buckets.set(key, bucket);
    }

    return Array.from(buckets.entries()).map(([date, value]) => ({ date, ...value }));
  }

  async exportCsv(eventId: string, filters?: Partial<GiftTransactionFilters>): Promise<string> {
    const where = buildWhere({ ...filters, eventId });
    const rows = await prisma.eventGiftPayment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { receipt: { select: { receiptNumber: true } } },
    });

    const header = [
      "date",
      "reference",
      "status",
      "gift_type",
      "guest",
      "email",
      "phone",
      "anonymous",
      "method",
      "amount",
      "fee",
      "net",
      "currency",
      "paid_at",
      "receipt_number",
      "reconciled_at",
      "note",
    ].join(",");

    const escape = (value: unknown) => {
      const text = value === null || value === undefined ? "" : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    const lines = rows.map((gift) =>
      [
        gift.createdAt.toISOString(),
        gift.reference,
        gift.status,
        GIFT_TYPE_LABELS[gift.giftType],
        displayGiftGuestName(gift.guestName, gift.isAnonymous),
        gift.guestEmail ?? "",
        gift.guestPhone ?? "",
        gift.isAnonymous ? "yes" : "no",
        METHOD_LABELS.get(
          ((gift.metadata as { method?: string } | null)?.method ?? "") as never
        ) ?? "",
        toMajorUnits(gift.amountMinor, gift.currency).toFixed(2),
        toMajorUnits(gift.feeMinor, gift.currency).toFixed(2),
        toMajorUnits(gift.netAmountMinor, gift.currency).toFixed(2),
        gift.currency,
        gift.paidAt ? gift.paidAt.toISOString() : "",
        gift.receipt?.receiptNumber ?? "",
        gift.reconciledAt ? gift.reconciledAt.toISOString() : "",
        gift.organiserNote ?? "",
      ]
        .map(escape)
        .join(",")
    );

    return `${header}\n${lines.join("\n")}\n`;
  }

  async setNote(giftPaymentId: string, eventId: string, note: string) {
    const result = await prisma.eventGiftPayment.updateMany({
      where: { id: giftPaymentId, eventId },
      data: { organiserNote: note.trim().slice(0, 1000) || null },
    });
    return result.count > 0;
  }

  async markReconciled(giftPaymentId: string, eventId: string, actorId: string) {
    const result = await prisma.eventGiftPayment.updateMany({
      where: { id: giftPaymentId, eventId },
      data: { reconciledAt: new Date(), reconciledById: actorId },
    });
    return result.count > 0;
  }

  /** Gifts the signed-in user sent — their own rows only, across all events. */
  async listMyGifts(userId: string, options: { page?: number | string | null } = {}) {
    const { page, limit, skip } = parsePaginationInput(
      { page: options.page, limit: 10 },
      { limit: 10, maxLimit: 50 }
    );
    const where: Prisma.EventGiftPaymentWhereInput = {
      userId,
      status: { in: ["SUCCESS", "REFUNDED", "PROCESSING", "PENDING"] },
    };

    const [items, total] = await Promise.all([
      prisma.eventGiftPayment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          event: { select: { title: true, hostName: true } },
          campaign: { select: { publicToken: true } },
          receipt: { select: { id: true, revokedAt: true } },
        },
      }),
      prisma.eventGiftPayment.count({ where }),
    ]);

    return paginatedResult(items, total, page, limit);
  }
}

function toRow(
  gift: Prisma.EventGiftPaymentGetPayload<{ include: { receipt: { select: { id: true } } } }>
): GiftTransactionRow {
  return {
    id: gift.id,
    reference: gift.reference,
    status: gift.status,
    giftTypeLabel: GIFT_TYPE_LABELS[gift.giftType],
    amountMinor: gift.amountMinor,
    amountFormatted: formatMinor(gift.amountMinor, gift.currency),
    netAmountMinor: gift.netAmountMinor,
    feeMinor: gift.feeMinor,
    currency: gift.currency,
    guestName: displayGiftGuestName(gift.guestName, gift.isAnonymous),
    guestEmail: gift.isAnonymous ? null : gift.guestEmail,
    guestPhone: gift.isAnonymous ? null : gift.guestPhone,
    guestMessage: gift.guestMessage,
    isAnonymous: gift.isAnonymous,
    method: (gift.metadata as { method?: string } | null)?.method ?? null,
    channel: gift.channel,
    createdAt: gift.createdAt.toISOString(),
    paidAt: gift.paidAt ? gift.paidAt.toISOString() : null,
    reconciledAt: gift.reconciledAt ? gift.reconciledAt.toISOString() : null,
    organiserNote: gift.organiserNote,
    refundedAt: gift.refundedAt ? gift.refundedAt.toISOString() : null,
    refundReason: gift.refundReason,
    hasReceipt: Boolean(gift.receipt),
  };
}

export const giftAdminService = new GiftAdminService();
