import type { SupportTicketCategory, SupportTicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parsePaginationInput, paginatedResult } from "@/lib/pagination";

const CATEGORIES: SupportTicketCategory[] = [
  "ACCOUNT",
  "PAYMENTS",
  "TICKETS",
  "INVITATIONS",
  "ADMISSION",
  "TECHNICAL",
  "OTHER",
];

function parseCategory(value: unknown): SupportTicketCategory {
  if (typeof value === "string" && CATEGORIES.includes(value as SupportTicketCategory)) {
    return value as SupportTicketCategory;
  }
  return "OTHER";
}

export function userCanAccessSupportTicket(
  ticketUserId: string,
  actorId: string,
  asAdmin: boolean
): boolean {
  return asAdmin || ticketUserId === actorId;
}

export class SupportTicketService {
  async create(userId: string, input: { subject: string; body: string; category?: unknown }) {
    const subject = input.subject.trim();
    const body = input.body.trim();
    if (subject.length < 3) throw new Error("Subject is required");
    if (body.length < 4) throw new Error("Please describe the issue");

    return prisma.$transaction(async (tx) => {
      const ticket = await tx.customerSupportTicket.create({
        data: {
          userId,
          subject,
          category: parseCategory(input.category),
        },
      });
      await tx.customerSupportMessage.create({
        data: { ticketId: ticket.id, authorId: userId, body, isInternal: false },
      });
      await tx.customerSupportEvent.create({
        data: { ticketId: ticket.id, actorId: userId, toStatus: "OPEN", note: "created" },
      });
      return ticket;
    });
  }

  async listForUser(
    userId: string,
    options?: { page?: number; limit?: number; status?: string; q?: string }
  ) {
    const { page, limit, skip } = parsePaginationInput(options, { limit: 20 });
    const where = {
      userId,
      ...(options?.status && options.status !== "all"
        ? { status: options.status as SupportTicketStatus }
        : {}),
      ...(options?.q
        ? { subject: { contains: options.q } }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.customerSupportTicket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { _count: { select: { messages: true } } },
      }),
      prisma.customerSupportTicket.count({ where }),
    ]);
    return paginatedResult(items, total, page, limit);
  }

  async listForAdmin(options?: {
    page?: number;
    limit?: number;
    status?: string;
    q?: string;
    assignedToId?: string;
  }) {
    const { page, limit, skip } = parsePaginationInput(options, { limit: 20 });
    const where = {
      ...(options?.status && options.status !== "all"
        ? { status: options.status as SupportTicketStatus }
        : {}),
      ...(options?.assignedToId ? { assignedToId: options.assignedToId } : {}),
      ...(options?.q ? { subject: { contains: options.q } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.customerSupportTicket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true } },
          _count: { select: { messages: true } },
        },
      }),
      prisma.customerSupportTicket.count({ where }),
    ]);
    return paginatedResult(items, total, page, limit);
  }

  async getForUser(ticketId: string, userId: string) {
    const ticket = await prisma.customerSupportTicket.findFirst({
      where: { id: ticketId, userId },
      include: {
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: "asc" },
        },
        events: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!ticket) throw new Error("Support ticket not found");
    return ticket;
  }

  async getForAdmin(ticketId: string) {
    const ticket = await prisma.customerSupportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        events: { orderBy: { createdAt: "asc" } },
        user: { select: { id: true, name: true, email: true } },
      },
    });
    if (!ticket) throw new Error("Support ticket not found");
    return ticket;
  }

  async reply(input: {
    ticketId: string;
    authorId: string;
    body: string;
    isInternal: boolean;
    asAdmin: boolean;
  }) {
    const body = input.body.trim();
    if (body.length < 1) throw new Error("Message is required");
    const ticket = await prisma.customerSupportTicket.findUnique({ where: { id: input.ticketId } });
    if (!ticket) throw new Error("Support ticket not found");
    if (!input.asAdmin && ticket.userId !== input.authorId) {
      throw new Error("Support ticket not found");
    }
    if (input.isInternal && !input.asAdmin) {
      throw new Error("Internal notes are staff-only");
    }
    return prisma.customerSupportMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: input.authorId,
        body,
        isInternal: input.isInternal,
      },
    });
  }

  async updateStatus(
    ticketId: string,
    actorId: string,
    status: SupportTicketStatus,
    assignedToId?: string | null
  ) {
    const current = await prisma.customerSupportTicket.findUnique({ where: { id: ticketId } });
    if (!current) throw new Error("Support ticket not found");
    const updated = await prisma.customerSupportTicket.update({
      where: { id: ticketId },
      data: {
        status,
        assignedToId: assignedToId === undefined ? current.assignedToId : assignedToId,
        resolvedAt: status === "RESOLVED" || status === "CLOSED" ? new Date() : current.resolvedAt,
      },
    });
    await prisma.customerSupportEvent.create({
      data: {
        ticketId,
        actorId,
        fromStatus: current.status,
        toStatus: status,
      },
    });
    return updated;
  }
}

export const supportTicketService = new SupportTicketService();
