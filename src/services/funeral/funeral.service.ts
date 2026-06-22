import { prisma } from "@/lib/prisma";
import type { ApprovalStatus, PrivacyStatus } from "@prisma/client";

export interface CreateFuneralProfileInput {
  eventId: string;
  deceasedName: string;
  dateOfBirth?: string;
  dateOfPassing?: string;
  age?: number;
  biography?: string;
  familyName?: string;
  photoUrl?: string;
  theme?: string;
  privacyStatus?: PrivacyStatus;
  burialVenue?: string;
  burialDirections?: string;
  livestreamUrl?: string;
}

export interface CreateTributeInput {
  eventId: string;
  userName: string;
  message: string;
  mediaUrl?: string;
}

export interface CreateProgramItemInput {
  eventId: string;
  title: string;
  description?: string;
  startTime?: string;
  sortOrder?: number;
}

export class FuneralService {
  async getOrCreateProfile(eventId: string, defaults?: Partial<CreateFuneralProfileInput>) {
    const existing = await prisma.funeralProfile.findUnique({ where: { eventId } });
    if (existing) return existing;

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new Error("Event not found");

    return prisma.funeralProfile.create({
      data: {
        eventId,
        deceasedName: defaults?.deceasedName ?? event.title,
        biography: defaults?.biography ?? event.description ?? undefined,
        familyName: defaults?.familyName ?? event.hostName,
        burialVenue: defaults?.burialVenue ?? event.venueName ?? undefined,
        burialDirections: defaults?.burialDirections ?? event.landmark ?? undefined,
        privacyStatus: defaults?.privacyStatus ?? "PUBLIC",
      },
    });
  }

  async updateProfile(eventId: string, data: Partial<CreateFuneralProfileInput>) {
    await this.getOrCreateProfile(eventId);
    return prisma.funeralProfile.update({
      where: { eventId },
      data: {
        deceasedName: data.deceasedName,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        dateOfPassing: data.dateOfPassing ? new Date(data.dateOfPassing) : undefined,
        age: data.age,
        biography: data.biography,
        familyName: data.familyName,
        photoUrl: data.photoUrl,
        theme: data.theme,
        privacyStatus: data.privacyStatus,
        burialVenue: data.burialVenue,
        burialDirections: data.burialDirections,
        livestreamUrl: data.livestreamUrl,
      },
    });
  }

  async getMemorialPage(eventSlug: string) {
    const event = await prisma.event.findUnique({
      where: { slug: eventSlug },
      include: {
        funeralProfile: true,
        funeralPrograms: { orderBy: { sortOrder: "asc" } },
        tributeMessages: {
          where: { approvalStatus: "APPROVED" },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        contributions: {
          where: { isAnonymous: false },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!event?.funeralProfile) return null;
    if (event.funeralProfile.privacyStatus === "PRIVATE") return null;

    return event;
  }

  async addTribute(input: CreateTributeInput, autoApprove = false) {
    return prisma.tributeMessage.create({
      data: {
        eventId: input.eventId,
        userName: input.userName,
        message: input.message,
        mediaUrl: input.mediaUrl,
        approvalStatus: autoApprove ? "APPROVED" : "PENDING",
      },
    });
  }

  async moderateTribute(tributeId: string, status: ApprovalStatus) {
    return prisma.tributeMessage.update({
      where: { id: tributeId },
      data: { approvalStatus: status },
    });
  }

  async getTributes(eventId: string, includePending = false) {
    return prisma.tributeMessage.findMany({
      where: {
        eventId,
        ...(includePending ? {} : { approvalStatus: "APPROVED" }),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async addProgramItem(input: CreateProgramItemInput) {
    return prisma.funeralProgram.create({ data: input });
  }

  async getProgram(eventId: string) {
    return prisma.funeralProgram.findMany({
      where: { eventId },
      orderBy: { sortOrder: "asc" },
    });
  }

  async getProgramItem(id: string) {
    return prisma.funeralProgram.findUnique({ where: { id } });
  }

  async deleteProgramItem(id: string) {
    return prisma.funeralProgram.delete({ where: { id } });
  }
}

export const funeralService = new FuneralService();
