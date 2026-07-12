import { prisma } from "@/lib/prisma";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";

const DEFAULT_CHANNELS = [
  { slug: "general", name: "General", isDefault: true },
  { slug: "guests", name: "Guests" },
  { slug: "design", name: "Design" },
  { slug: "finance", name: "Finance" },
  { slug: "vendors", name: "Vendors" },
  { slug: "urgent", name: "Urgent" },
  { slug: "announcements", name: "Announcements" },
];

export class ChatService {
  async ensureDefaultChannels(eventId: string) {
    const existing = await prisma.eventChatChannel.count({ where: { eventId } });
    if (existing > 0) return;

    await prisma.eventChatChannel.createMany({
      data: DEFAULT_CHANNELS.map((c) => ({ eventId, ...c })),
    });
  }

  async listChannels(eventId: string) {
    await this.ensureDefaultChannels(eventId);
    return prisma.eventChatChannel.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
    });
  }

  async listMessages(
    channelId: string,
    pagination?: { page?: number; limit?: number }
  ) {
    const { page, limit, skip } = parsePaginationInput(pagination);

    const [items, total] = await Promise.all([
      prisma.eventChatMessage.findMany({
        where: { channelId },
        include: {
          sender: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.eventChatMessage.count({ where: { channelId } }),
    ]);

    return paginatedResult(items.reverse(), total, page, limit);
  }

  async sendMessage(input: {
    channelId: string;
    senderId: string;
    body?: string;
    fileUrl?: string;
    fileName?: string;
    voiceUrl?: string;
    mentions?: string[];
  }) {
    return prisma.eventChatMessage.create({
      data: {
        channelId: input.channelId,
        senderId: input.senderId,
        body: input.body,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        voiceUrl: input.voiceUrl,
        mentions: input.mentions,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }
}

export const chatService = new ChatService();
