import { Prisma, type TicketStatus, type TicketType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { paginatedResult } from "@/lib/pagination";
import { qrService } from "@/services/qr/qr.service";
import { decimalToMinorUnits, minorToDecimalString } from "@/lib/gifts/money";
import {
  applyPromoDiscountMinor,
  incrementPromoUse,
  listTicketPromos,
  validateTicketPromo,
} from "@/lib/tickets/promo-storage";
import {
  hasInventory,
  isClosedTicketOrder,
  isSettledTicketOrder,
} from "@/lib/tickets/inventory";
import {
  canCancelTicketOrder,
  canRefundTicketOrder,
  canTransferTicketOrder,
  isPendingReservationExpired,
  refundReleasesInventory,
  ticketReservationTtlMs,
} from "@/lib/tickets/lifecycle";
import { postTicketRefund } from "@/services/tickets/ticket-ledger.service";

const TICKET_TX = { maxWait: 10_000, timeout: 10_000 } as const;
const purchaseGates = new Map<string, Promise<unknown>>();

/**
 * Process-local purchase serialization. This prevents a 40-buyer stampede from
 * exhausting SQLite's single writer inside one Node process. It does not
 * coordinate across PM2 cluster workers or multiple app instances. Production
 * SQLite must keep `celeventic` at `instances: 1` / `exec_mode: "fork"`.
 */

async function withTicketGate<T>(ticketId: string, operation: () => Promise<T>): Promise<T> {
  const previous = purchaseGates.get(ticketId) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(operation);
  purchaseGates.set(ticketId, run);
  try {
    return await run;
  } finally {
    if (purchaseGates.get(ticketId) === run) purchaseGates.delete(ticketId);
  }
}

export interface CreateTicketInput {
  eventId: string;
  name: string;
  type: TicketType;
  description?: string;
  price: number;
  maxQuantity?: number;
}

export interface UpdateTicketInput {
  name?: string;
  type?: TicketType;
  description?: string;
  price?: number;
  maxQuantity?: number | null;
  status?: TicketStatus;
}

export interface PurchaseTicketInput {
  ticketId: string;
  buyerName: string;
  buyerEmail?: string;
  buyerPhone?: string;
  quantity: number;
  userId?: string;
  promoCode?: string;
}

export class TicketService {
  async createTicket(input: CreateTicketInput) {
    return prisma.ticket.create({
      data: {
        eventId: input.eventId,
        name: input.name,
        type: input.type,
        description: input.description,
        price: input.price,
        maxQuantity: input.maxQuantity,
        status: "PENDING",
      },
    });
  }

  async updateTicket(ticketId: string, input: UpdateTicketInput) {
    return prisma.ticket.update({
      where: { id: ticketId },
      data: {
        ...input,
        maxQuantity: input.maxQuantity === null ? null : input.maxQuantity,
      },
    });
  }

  async deleteTicket(ticketId: string) {
    const orders = await prisma.ticketOrder.count({ where: { ticketId } });
    if (orders > 0) {
      return prisma.ticket.update({
        where: { id: ticketId },
        data: { status: "CANCELLED" },
      });
    }
    return prisma.ticket.delete({ where: { id: ticketId } });
  }

  async getEventTickets(eventId: string) {
    return prisma.ticket.findMany({
      where: { eventId, status: { not: "CANCELLED" } },
      orderBy: { price: "asc" },
    });
  }

  async publishTicket(ticketId: string) {
    return prisma.ticket.update({ where: { id: ticketId }, data: { status: "PAID" } });
  }

  async unpublishTicket(ticketId: string) {
    return prisma.ticket.update({ where: { id: ticketId }, data: { status: "PENDING" } });
  }

  async getPublicEventTickets(eventId: string) {
    return prisma.ticket.findMany({
      where: { eventId, status: "PAID" },
      orderBy: { price: "asc" },
    });
  }

  async getEventOrders(eventId: string, page = 1, limit = 20) {
    const where = { eventId };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.ticketOrder.findMany({
        where,
        include: {
          ticket: { select: { id: true, name: true, type: true } },
          payments: { select: { id: true, status: true, amount: true, provider: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.ticketOrder.count({ where }),
    ]);
    return paginatedResult(items, total, page, limit);
  }

  async getEventStats(eventId: string) {
    const [tickets, orders, paidOrders, revenue] = await Promise.all([
      prisma.ticket.findMany({ where: { eventId, status: { not: "CANCELLED" } } }),
      prisma.ticketOrder.count({ where: { eventId } }),
      prisma.ticketOrder.count({ where: { eventId, status: "PAID" } }),
      prisma.ticketOrder.aggregate({
        where: { eventId, status: "PAID" },
        _sum: { totalAmount: true },
      }),
    ]);

    const totalCapacity = tickets.reduce((sum, t) => sum + (t.maxQuantity ?? 0), 0);
    const totalSold = tickets.reduce((sum, t) => sum + t.soldCount, 0);

    return {
      ticketTypes: tickets.length,
      totalOrders: orders,
      paidOrders,
      pendingOrders: orders - paidOrders,
      totalSold,
      totalCapacity: totalCapacity || null,
      revenueGhs: Number(revenue._sum.totalAmount ?? 0),
      tickets: tickets.map((t) => ({
        id: t.id,
        name: t.name,
        soldCount: t.soldCount,
        maxQuantity: t.maxQuantity,
        price: Number(t.price),
      })),
    };
  }

  async purchaseTicket(input: PurchaseTicketInput) {
    return withTicketGate(input.ticketId, () => this.purchaseTicketOnce(input));
  }

  private async purchaseTicketOnce(input: PurchaseTicketInput) {
    if (input.promoCode) {
      const ticketMeta = await prisma.ticket.findUnique({
        where: { id: input.ticketId },
        select: { eventId: true },
      });
      if (ticketMeta) await listTicketPromos(ticketMeta.eventId);
    }
    return prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: input.ticketId },
        include: { event: true },
      });

      if (!ticket) throw new Error("Ticket not found");
      if (ticket.status === "CANCELLED") throw new Error("This ticket type is no longer available");
      if (ticket.status !== "PAID") throw new Error("This ticket is not yet available for purchase");
      if (!Number.isFinite(input.quantity) || input.quantity < 1) {
        throw new Error("Quantity must be at least 1");
      }

      await expireStaleHoldsForTicket(tx, ticket.id);

      const pending = await tx.ticketOrder.aggregate({
        where: { ticketId: ticket.id, status: "PENDING" },
        _sum: { quantity: true },
      });
      const held = ticket.soldCount + Number(pending._sum.quantity ?? 0);
      if (!hasInventory(held, ticket.maxQuantity, input.quantity)) {
        throw new Error("Not enough tickets available");
      }

      const unitMinor = decimalToMinorUnits(ticket.price, ticket.currency);
      let totalMinor = unitMinor * input.quantity;
      let appliedPromo: string | undefined;

      if (input.promoCode) {
        const promo = await validateTicketPromo(ticket.eventId, input.promoCode, tx);
        if (!promo) throw new Error("Invalid or expired promo code");
        totalMinor = applyPromoDiscountMinor(totalMinor, promo);
        appliedPromo = promo.code;
      }

      const isFree = totalMinor === 0;
      const totalAmount = new Prisma.Decimal(minorToDecimalString(totalMinor, ticket.currency));

      const order = await tx.ticketOrder.create({
        data: {
          eventId: ticket.eventId,
          ticketId: ticket.id,
          userId: input.userId,
          buyerName: input.buyerName,
          buyerEmail: input.buyerEmail,
          buyerPhone: input.buyerPhone,
          quantity: input.quantity,
          totalAmount,
          currency: ticket.currency,
          promoCode: appliedPromo ?? input.promoCode,
          status: isFree ? "PAID" : "PENDING",
        },
      });

      if (isFree) {
        if (ticket.maxQuantity != null) {
          const claimed = await tx.ticket.updateMany({
            where: {
              id: ticket.id,
              soldCount: { lte: ticket.maxQuantity - input.quantity },
            },
            data: { soldCount: { increment: input.quantity } },
          });
          if (claimed.count === 0) throw new Error("Not enough tickets available");
        } else {
          await tx.ticket.update({
            where: { id: ticket.id },
            data: { soldCount: { increment: input.quantity } },
          });
        }
      }

      if (isFree && appliedPromo) {
        await incrementPromoUse(ticket.eventId, appliedPromo, tx, {
          userId: input.userId,
          orderId: order.id,
        });
      }

      return { order, ticket, isFree, appliedPromo, totalAmount };
    }, TICKET_TX).then(async ({ order, ticket, isFree, totalAmount }) => {
      if (isFree) {
        for (let i = 0; i < input.quantity; i++) {
          await qrService.createTicketQr(ticket.eventId, ticket.id);
        }
      }
      return { order, requiresPayment: !isFree, totalAmount: Number(totalAmount) };
    });
  }

  async confirmPurchase(orderId: string) {
    const cutoff = new Date(Date.now() - ticketReservationTtlMs());
    const expired = await prisma.ticketOrder.updateMany({
      where: { id: orderId, status: "PENDING", createdAt: { lte: cutoff } },
      data: { status: "EXPIRED" },
    });
    if (expired.count > 0) {
      throw new Error("This reservation has expired");
    }

    const claimed = await prisma.$transaction(async (tx) => {
      const order = await tx.ticketOrder.findUnique({
        where: { id: orderId },
        include: { ticket: true },
      });
      if (!order) throw new Error("Order not found");
      if (isClosedTicketOrder(order.status)) {
        throw new Error("This order can no longer be confirmed");
      }
      if (order.status === "PENDING" && isPendingReservationExpired(order.createdAt)) {
        throw new Error("This reservation has expired");
      }
      if (isSettledTicketOrder(order.status)) {
        return { order, minted: false as const };
      }

      const claimedOrder = await tx.ticketOrder.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: { status: "PAID" },
      });
      if (claimedOrder.count === 0) {
        const latest = await tx.ticketOrder.findUnique({ where: { id: orderId }, include: { ticket: true } });
        return { order: latest ?? order, minted: false as const };
      }

      const maxQuantity = order.ticket.maxQuantity;
      if (maxQuantity != null) {
        const stock = await tx.ticket.updateMany({
          where: {
            id: order.ticketId,
            soldCount: { lte: maxQuantity - order.quantity },
          },
          data: { soldCount: { increment: order.quantity } },
        });
        if (stock.count === 0) {
          await tx.ticketOrder.update({
            where: { id: orderId },
            data: { status: "CANCELLED" },
          });
          throw new Error("Not enough tickets available");
        }
      } else {
        await tx.ticket.update({
          where: { id: order.ticketId },
          data: { soldCount: { increment: order.quantity } },
        });
      }

      if (order.promoCode) {
        await incrementPromoUse(order.eventId, order.promoCode, tx, {
          userId: order.userId,
          orderId: order.id,
        });
      }

      const paid = await tx.ticketOrder.findUnique({
        where: { id: orderId },
        include: { ticket: true },
      });
      return { order: paid ?? order, minted: true as const };
    }, TICKET_TX);

    if (!claimed.minted) {
      return {
        order: claimed.order,
        qrDataUrl: undefined,
        qrDataUrls: [] as string[],
        alreadyPaid: true,
      };
    }

    const qrUrls: string[] = [];
    for (let i = 0; i < claimed.order.quantity; i++) {
      const { dataUrl } = await qrService.createTicketQr(claimed.order.eventId, claimed.order.ticketId);
      qrUrls.push(dataUrl);
    }

    return { order: claimed.order, qrDataUrl: qrUrls[0], qrDataUrls: qrUrls };
  }

  async cancelOrder(orderId: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.ticketOrder.findUnique({ where: { id: orderId } });
      if (!order) throw new Error("Order not found");
      if (!canCancelTicketOrder(order.status)) {
        throw new Error("Only unpaid pending orders can be cancelled");
      }
      const claimed = await tx.ticketOrder.updateMany({
        where: { id: orderId, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      if (claimed.count === 0) {
        throw new Error("This order can no longer be cancelled");
      }
      return tx.ticketOrder.findUniqueOrThrow({ where: { id: orderId } });
    });
  }

  /**
   * Marks a paid order refunded and releases inventory.
   * Does not call Paystack or Hubtel. Provider refunds stay off until explicitly approved.
   */
  async refundOrder(orderId: string) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.ticketOrder.findUnique({ where: { id: orderId } });
      if (!order) throw new Error("Order not found");
      if (!canRefundTicketOrder(order.status)) {
        throw new Error("Only paid unused orders can be refunded");
      }
      const claimed = await tx.ticketOrder.updateMany({
        where: { id: orderId, status: "PAID" },
        data: { status: "REFUNDED" },
      });
      if (claimed.count === 0) {
        throw new Error("This order can no longer be refunded");
      }
      if (refundReleasesInventory(order.status) && order.quantity > 0) {
        await tx.ticket.update({
          where: { id: order.ticketId },
          data: { soldCount: { decrement: order.quantity } },
        });
        await tx.ticket.updateMany({
          where: { id: order.ticketId, soldCount: { lt: 0 } },
          data: { soldCount: 0 },
        });
      }

      const payment = await tx.payment.findFirst({
        where: { ticketOrderId: orderId, status: "SUCCESSFUL" },
        orderBy: { createdAt: "desc" },
      });
      if (payment) {
        await postTicketRefund(
          {
            eventId: order.eventId,
            orderId,
            paymentId: payment.id,
            currency: payment.currency,
          },
          tx
        );
      }

      return tx.ticketOrder.findUniqueOrThrow({ where: { id: orderId } });
    });
  }

  async transferOrder(
    orderId: string,
    next: { buyerName: string; buyerEmail?: string; buyerPhone?: string }
  ) {
    const name = next.buyerName.trim();
    if (name.length < 2) throw new Error("New ticket holder name is required");
    return prisma.$transaction(async (tx) => {
      const order = await tx.ticketOrder.findUnique({ where: { id: orderId } });
      if (!order) throw new Error("Order not found");
      if (!canTransferTicketOrder(order.status)) {
        throw new Error("Only paid unused tickets can be transferred");
      }
      const claimed = await tx.ticketOrder.updateMany({
        where: { id: orderId, status: "PAID" },
        data: {
          buyerName: name,
          buyerEmail: next.buyerEmail?.trim() || order.buyerEmail,
          buyerPhone: next.buyerPhone?.trim() || order.buyerPhone,
        },
      });
      if (claimed.count === 0) {
        throw new Error("This order can no longer be transferred");
      }
      return tx.ticketOrder.findUniqueOrThrow({ where: { id: orderId } });
    });
  }

  async expireStalePendingOrders(now = new Date()) {
    const cutoff = new Date(now.getTime() - ticketReservationTtlMs());
    const result = await prisma.ticketOrder.updateMany({
      where: { status: "PENDING", createdAt: { lt: cutoff } },
      data: { status: "EXPIRED" },
    });
    return result.count;
  }
}

async function expireStaleHoldsForTicket(
  tx: Prisma.TransactionClient | typeof prisma,
  ticketId: string,
  now = new Date()
) {
  const ttlMs = ticketReservationTtlMs();
  await tx.ticketOrder.updateMany({
    where: {
      ticketId,
      status: "PENDING",
      createdAt: { lt: new Date(now.getTime() - ttlMs) },
    },
    data: { status: "EXPIRED" },
  });
}

export const ticketService = new TicketService();
