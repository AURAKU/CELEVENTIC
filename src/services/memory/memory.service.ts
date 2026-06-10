import { prisma } from "@/lib/prisma";
import type { PrivacyStatus } from "@prisma/client";

export interface CreateMemoryInput {
  eventId: string;
  type: "photo" | "video" | "guestbook" | "tribute" | "highlight";
  url?: string;
  content?: string;
  author?: string;
}

export class MemoryService {
  async getOrCreateVault(eventId: string, ownerId: string) {
    const existing = await prisma.memoryVault.findUnique({ where: { eventId } });
    if (existing) return existing;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    return prisma.memoryVault.create({
      data: {
        eventId,
        ownerId,
        title: event ? `${event.title} — Memory Vault` : "Event Memory Vault",
      },
    });
  }

  async updateVaultSettings(
    eventId: string,
    data: { title?: string; description?: string; privacyStatus?: PrivacyStatus }
  ) {
    return prisma.memoryVault.update({
      where: { eventId },
      data,
    });
  }

  async create(input: CreateMemoryInput) {
    return prisma.eventMemory.create({
      data: {
        eventId: input.eventId,
        type: input.type,
        url: input.url,
        content: input.content,
        author: input.author,
      },
    });
  }

  async getEventMemories(eventId: string, type?: string) {
    return prisma.eventMemory.findMany({
      where: { eventId, ...(type ? { type } : {}) },
      orderBy: { createdAt: "desc" },
    });
  }

  async getVaultSummary(eventId: string) {
    const memories = await prisma.eventMemory.groupBy({
      by: ["type"],
      where: { eventId },
      _count: true,
    });

    return memories.reduce(
      (acc, m) => {
        acc[m.type] = m._count;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  async getVaultDashboard(eventId: string, ownerId: string) {
    const vault = await this.getOrCreateVault(eventId, ownerId);
    const [memories, summary, guestbook] = await Promise.all([
      this.getEventMemories(eventId),
      this.getVaultSummary(eventId),
      this.getEventMemories(eventId, "guestbook"),
    ]);
    return { vault, memories, summary, guestbook };
  }
}

export const memoryService = new MemoryService();
