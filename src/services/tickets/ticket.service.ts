import { prisma } from "@/lib/prisma";
import { qrService } from "@/services/qr/qr.service";
import {
  applyPromoDiscount,
  incrementPromoUse,
  validateTicketPromo,
} from "@/lib/tickets/promo-storage";
import type { TicketStatus, TicketType } from "@prisma/client";

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

  async getEventOrders(eventId: string) {
    return prisma.ticketOrder.findMany({
      where: { eventId },
      include: {
        ticket: { select: { id: true, name: true, type: true } },
        payments: { select: { id: true, status: true, amount: true, provider: true } },
      },
      orderBy: { createdAt: "desc" },
    });
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
    const ticket = await prisma.ticket.findUnique({
      where: { id: input.ticketId },
      include: { event: true },
    });

    if (!ticket) throw new Error("Ticket not found");
    if (ticket.status === "CANCELLED") throw new Error("This ticket type is no longer available");
    if (ticket.status !== "PAID") throw new Error("This ticket is not yet available for purchase");
    if (ticket.maxQuantity && ticket.soldCount + input.quantity > ticket.maxQuantity) {
      throw new Error("Not enough tickets available");
    }

    let totalAmount = Number(ticket.price) * input.quantity;
    let appliedPromo: string | undefined;

    if (input.promoCode) {
      const promo = await validateTicketPromo(ticket.eventId, input.promoCode);
      if (!promo) throw new Error("Invalid or expired promo code");
      totalAmount = applyPromoDiscount(totalAmount, promo);
      appliedPromo = promo.code;
    }

    const isFree = totalAmount === 0;

    const order = await prisma.ticketOrder.create({
      data: {
        eventId: ticket.eventId,
        ticketId: ticket.id,
        userId: input.userId,
        buyerName: input.buyerName,
        buyerEmail: input.buyerEmail,
        buyerPhone: input.buyerPhone,
        quantity: input.quantity,
        totalAmount,
        promoCode: appliedPromo ?? input.promoCode,
        status: isFree ? "PAID" : "PENDING",
      },
    });

    if (isFree) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { soldCount: { increment: input.quantity } },
      });
      if (appliedPromo) await incrementPromoUse(ticket.eventId, appliedPromo);
      for (let i = 0; i < input.quantity; i++) {
        await qrService.createTicketQr(ticket.eventId, ticket.id);
      }
    }

    return { order, requiresPayment: !isFree, totalAmount };
  }

  async confirmPurchase(orderId: string) {
    const order = await prisma.ticketOrder.findUnique({
      where: { id: orderId },
      include: { ticket: true },
    });

    if (!order) throw new Error("Order not found");

    await Promise.all([
      prisma.ticketOrder.update({
        where: { id: orderId },
        data: { status: "PAID" },
      }),
      prisma.ticket.update({
        where: { id: order.ticketId },
        data: { soldCount: { increment: order.quantity }, status: "PAID" },
      }),
    ]);

    if (order.promoCode) {
      await incrementPromoUse(order.eventId, order.promoCode);
    }

    const qrUrls: string[] = [];
    for (let i = 0; i < order.quantity; i++) {
      const { dataUrl } = await qrService.createTicketQr(order.eventId, order.ticketId);
      qrUrls.push(dataUrl);
    }

    return { order, qrDataUrl: qrUrls[0], qrDataUrls: qrUrls };
  }
}

export const ticketService = new TicketService();
