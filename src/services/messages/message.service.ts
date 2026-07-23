import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { notificationService } from "@/services/notifications/notification.service";

export interface SendMessageInput {
  senderId: string;
  recipientId: string;
  body: string;
  subject?: string;
  threadId?: string;
  leadId?: string;
}

export class MessageService {
  async send(input: SendMessageInput) {
    const threadId =
      input.threadId ??
      (input.leadId ? `lead:${input.leadId}` : `direct:${randomUUID()}`);

    const message = await prisma.userMessage.create({
      data: {
        senderId: input.senderId,
        recipientId: input.recipientId,
        subject: input.subject,
        body: input.body,
        threadId,
        leadId: input.leadId,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        recipient: { select: { id: true, name: true, role: true } },
      },
    });

    const link = input.leadId
      ? `/dashboard/messages?thread=${encodeURIComponent(threadId)}`
      : `/dashboard/messages?thread=${encodeURIComponent(threadId)}`;

    await notificationService.notify(input.recipientId, {
      title: input.subject ?? `Message from ${message.sender.name}`,
      message: input.body.slice(0, 200),
      type: "message",
      link,
    });

    return message;
  }

  async getInbox(userId: string) {
    const messages = await prisma.userMessage.findMany({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        sender: { select: { id: true, name: true, role: true } },
        recipient: { select: { id: true, name: true, role: true } },
        lead: {
          select: {
            id: true,
            vendor: { select: { businessName: true, slug: true } },
          },
        },
      },
    });

    const threads = new Map<
      string,
      {
        threadId: string;
        leadId: string | null;
        subject: string | null;
        lastMessage: string;
        lastAt: string;
        unread: number;
        otherParty: { id: string; name: string; role: string };
        vendorName?: string;
      }
    >();

    for (const m of messages) {
      const existing = threads.get(m.threadId);
      const isRecipient = m.recipientId === userId;
      const other = isRecipient ? m.sender : m.recipient;
      const unreadAdd = isRecipient && !m.isRead ? 1 : 0;

      if (!existing) {
        threads.set(m.threadId, {
          threadId: m.threadId,
          leadId: m.leadId,
          subject: m.subject ?? m.lead?.vendor?.businessName ?? null,
          lastMessage: m.body,
          lastAt: m.createdAt.toISOString(),
          unread: unreadAdd,
          otherParty: other,
          vendorName: m.lead?.vendor?.businessName,
        });
      } else if (unreadAdd) {
        existing.unread += unreadAdd;
      }
    }

    return Array.from(threads.values()).sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
    );
  }

  async getThread(userId: string, threadId: string, page = 1, limit = 50) {
    const take = Math.min(200, Math.max(1, limit));
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * take;
    const where = {
      threadId,
      OR: [{ senderId: userId }, { recipientId: userId }],
    };

    const [newestFirst, total] = await Promise.all([
      prisma.userMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          sender: { select: { id: true, name: true, role: true } },
        },
      }),
      prisma.userMessage.count({ where }),
    ]);

    await prisma.userMessage.updateMany({
      where: { threadId, recipientId: userId, isRead: false },
      data: { isRead: true },
    });

    // Chronological for the chat pane (oldest → newest within this window).
    const items = newestFirst.slice().reverse();
    const pages = Math.max(1, Math.ceil(total / take));
    return {
      items,
      total,
      page: safePage,
      limit: take,
      pages,
      hasMore: safePage < pages,
    };
  }

  async adminSendToUser(adminId: string, userId: string, subject: string, body: string) {
    return this.send({
      senderId: adminId,
      recipientId: userId,
      subject: subject || "Message from Celeventic Admin",
      body,
    });
  }

  async replyToLead(senderId: string, leadId: string, body: string) {
    const lead = await prisma.vendorLead.findUnique({
      where: { id: leadId },
      include: { vendor: { select: { userId: true, businessName: true } } },
    });
    if (!lead) throw new Error("Lead not found");

    const isVendor = lead.vendor.userId === senderId;
    const recipientId = isVendor ? lead.organizerId : lead.vendor.userId;

    if (senderId !== lead.organizerId && senderId !== lead.vendor.userId) {
      throw new Error("Not authorized for this conversation");
    }

    return this.send({
      senderId,
      recipientId,
      body,
      leadId,
      threadId: `lead:${leadId}`,
      subject: isVendor
        ? `Reply from ${lead.vendor.businessName}`
        : "Vendor message reply",
    });
  }
}

export const messageService = new MessageService();
