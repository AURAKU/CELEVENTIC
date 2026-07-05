import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { EventMemoryTokenType } from "@prisma/client";

function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

export class EventMemoryTokenService {
  async getOrCreateUploadToken(eventId: string, expiresAt?: Date | null) {
    const existing = await prisma.eventMemoryToken.findFirst({
      where: {
        eventId,
        type: "UPLOAD",
        isRevoked: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return existing;

    return prisma.eventMemoryToken.create({
      data: {
        eventId,
        token: generateToken(),
        type: "UPLOAD",
        expiresAt: expiresAt ?? null,
      },
    });
  }

  async getOrCreateViewToken(eventId: string) {
    const existing = await prisma.eventMemoryToken.findFirst({
      where: { eventId, type: "VIEW", isRevoked: false },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return existing;

    return prisma.eventMemoryToken.create({
      data: { eventId, token: generateToken(), type: "VIEW" },
    });
  }

  async resolveToken(token: string) {
    const record = await prisma.eventMemoryToken.findUnique({
      where: { token },
      include: {
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
            hostName: true,
            coverImageUrl: true,
            logoUrl: true,
          },
        },
      },
    });
    if (!record || record.isRevoked) return null;
    if (record.expiresAt && record.expiresAt < new Date()) return null;
    return record;
  }

  async revokeToken(tokenId: string) {
    return prisma.eventMemoryToken.update({
      where: { id: tokenId },
      data: { isRevoked: true },
    });
  }

  async regenerateUploadToken(eventId: string, expiresAt?: Date | null) {
    await prisma.eventMemoryToken.updateMany({
      where: { eventId, type: "UPLOAD", isRevoked: false },
      data: { isRevoked: true },
    });
    return this.getOrCreateUploadToken(eventId, expiresAt);
  }

  async regenerateViewToken(eventId: string) {
    await prisma.eventMemoryToken.updateMany({
      where: { eventId, type: "VIEW", isRevoked: false },
      data: { isRevoked: true },
    });
    return this.getOrCreateViewToken(eventId);
  }

  async listTokens(eventId: string, type?: EventMemoryTokenType) {
    return prisma.eventMemoryToken.findMany({
      where: { eventId, ...(type ? { type } : {}) },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const eventMemoryTokenService = new EventMemoryTokenService();
