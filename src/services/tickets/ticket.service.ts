import { prisma } from "@/lib/prisma";
import { qrService } from "@/services/qr/qr.service";
import type { TicketType } from "@prisma/client";

export interface CreateTicketInput {
  eventId: string;
  name: string;
  type: TicketType;
  description?: string;
  price: number;
  maxQuantity?: number;
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

  async getEventTickets(eventId: string) {
    return prisma.ticket.findMany({
      where: { eventId },
      orderBy: { price: "asc" },
    });
  }

  async purchaseTicket(input: PurchaseTicketInput) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: input.ticketId },
      include: { event: true },
    });

    if (!ticket) throw new Error("Ticket not found");
    if (ticket.maxQuantity && ticket.soldCount + input.quantity > ticket.maxQuantity) {
      throw new Error("Not enough tickets available");
    }

    const totalAmount = Number(ticket.price) * input.quantity;
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
        promoCode: input.promoCode,
        status: isFree ? "PAID" : "PENDING",
      },
    });

    if (isFree) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { soldCount: { increment: input.quantity } },
      });
      await qrService.createTicketQr(ticket.eventId, ticket.id);
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

    const { dataUrl } = await qrService.createTicketQr(order.eventId, order.ticketId);
    return { order, qrDataUrl: dataUrl };
  }
}

export const ticketService = new TicketService();
