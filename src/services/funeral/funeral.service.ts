import { prisma } from "@/lib/prisma";
import { paginatedResult, parsePaginationInput } from "@/lib/pagination";
import type {
  ApprovalStatus,
  ContributionPurpose,
  FuneralFamilyRole,
  GuestbookEntryType,
  LivestreamProvider,
  MemorialMediaKind,
  PrivacyStatus,
  TributeType,
} from "@prisma/client";

export interface CreateFuneralProfileInput {
  eventId: string;
  deceasedName: string;
  dateOfBirth?: string;
  dateOfPassing?: string;
  age?: number;
  biography?: string;
  familyName?: string;
  familyInformation?: string;
  lifeJourney?: string;
  achievements?: string;
  education?: string;
  career?: string;
  faithJourney?: string;
  legacyMessage?: string;
  photoUrl?: string;
  theme?: string;
  templateSlug?: string;
  revealStyle?: string;
  invitationAudioCategory?: string;
  privacyStatus?: PrivacyStatus;
  burialVenue?: string;
  burialDirections?: string;
  livestreamUrl?: string;
  familyContacts?: unknown;
  preferredLanguages?: unknown;
  legacyVisibility?: "PUBLIC" | "PRIVATE" | "FAMILY_ONLY";
}

export interface CreateTributeInput {
  eventId: string;
  userName: string;
  message: string;
  tributeType?: TributeType;
  mediaUrl?: string;
  country?: string;
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
        familyInformation: data.familyInformation,
        lifeJourney: data.lifeJourney,
        achievements: data.achievements,
        education: data.education,
        career: data.career,
        faithJourney: data.faithJourney,
        legacyMessage: data.legacyMessage,
        photoUrl: data.photoUrl,
        theme: data.theme,
        templateSlug: data.templateSlug,
        revealStyle: data.revealStyle,
        invitationAudioCategory: data.invitationAudioCategory,
        privacyStatus: data.privacyStatus,
        burialVenue: data.burialVenue,
        burialDirections: data.burialDirections,
        livestreamUrl: data.livestreamUrl,
        familyContacts: data.familyContacts as object | undefined,
        preferredLanguages: data.preferredLanguages as object | undefined,
        legacyVisibility: data.legacyVisibility,
      },
    });
  }

  async getMemorialPage(eventSlug: string, section?: string, page = 1, limit = 20) {
    const { skip, limit: take } = parsePaginationInput({ page, limit });

    const event = await prisma.event.findUnique({
      where: { slug: eventSlug },
      include: {
        funeralProfile: true,
        funeralPrograms: { orderBy: { sortOrder: "asc" } },
        thankYouPage: true,
        legacyArchive: true,
      },
    });

    if (!event?.funeralProfile) return null;
    if (event.funeralProfile.privacyStatus === "PRIVATE") return null;

    const base = {
      eventId: event.id,
      slug: event.slug,
      title: event.title,
      startDate: event.startDate,
      venueName: event.venueName,
      mapsLink: event.mapsLink,
      profile: event.funeralProfile,
      program: event.funeralPrograms,
      thankYou: event.thankYouPage,
      legacyArchive: event.legacyArchive,
    };

    if (!section || section === "overview") {
      const [candleCount, tributeCount, guestbookCount] = await Promise.all([
        prisma.virtualCandle.count({ where: { eventId: event.id } }),
        prisma.tributeMessage.count({ where: { eventId: event.id, approvalStatus: "APPROVED" } }),
        prisma.memorialGuestbookEntry.count({ where: { eventId: event.id, approvalStatus: "APPROVED" } }),
      ]);
      return { ...base, stats: { candleCount, tributeCount, guestbookCount } };
    }

    if (section === "tributes") {
      const [items, total] = await Promise.all([
        prisma.tributeMessage.findMany({
          where: { eventId: event.id, approvalStatus: "APPROVED" },
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
          skip,
          take,
        }),
        prisma.tributeMessage.count({ where: { eventId: event.id, approvalStatus: "APPROVED" } }),
      ]);
      return { ...base, tributes: paginatedResult(items, total, page, take) };
    }

    if (section === "candles") {
      const [items, total] = await Promise.all([
        prisma.virtualCandle.findMany({
          where: { eventId: event.id },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        prisma.virtualCandle.count({ where: { eventId: event.id } }),
      ]);
      return { ...base, candles: paginatedResult(items, total, page, take) };
    }

    if (section === "guestbook") {
      const [items, total] = await Promise.all([
        prisma.memorialGuestbookEntry.findMany({
          where: { eventId: event.id, approvalStatus: "APPROVED" },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        prisma.memorialGuestbookEntry.count({
          where: { eventId: event.id, approvalStatus: "APPROVED" },
        }),
      ]);
      return { ...base, guestbook: paginatedResult(items, total, page, take) };
    }

    if (section === "timeline") {
      const items = await prisma.memorialTimelineEntry.findMany({
        where: { eventId: event.id },
        orderBy: [{ sortOrder: "asc" }, { year: "asc" }],
      });
      return { ...base, timeline: items };
    }

    if (section === "gallery") {
      const [items, total] = await Promise.all([
        prisma.memorialMediaItem.findMany({
          where: { eventId: event.id, approvalStatus: "APPROVED" },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
          skip,
          take,
        }),
        prisma.memorialMediaItem.count({
          where: { eventId: event.id, approvalStatus: "APPROVED" },
        }),
      ]);
      return { ...base, gallery: paginatedResult(items, total, page, take) };
    }

    if (section === "contributions") {
      const [items, total] = await Promise.all([
        prisma.contribution.findMany({
          where: { eventId: event.id, isAnonymous: false },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        prisma.contribution.count({ where: { eventId: event.id, isAnonymous: false } }),
      ]);
      return {
        ...base,
        contributions: paginatedResult(
          items.map((c) => ({
            ...c,
            amount: Number(c.amount),
          })),
          total,
          page,
          take
        ),
      };
    }

    if (section === "livestreams") {
      const items = await prisma.memorialLivestream.findMany({
        where: { eventId: event.id },
        orderBy: [{ isLive: "desc" }, { sortOrder: "asc" }],
      });
      return { ...base, livestreams: items };
    }

    return base;
  }

  async addTribute(input: CreateTributeInput, autoApprove = false) {
    return prisma.tributeMessage.create({
      data: {
        eventId: input.eventId,
        userName: input.userName,
        message: input.message,
        tributeType: input.tributeType ?? "TEXT",
        mediaUrl: input.mediaUrl,
        country: input.country,
        approvalStatus: autoApprove ? "APPROVED" : "PENDING",
      },
    });
  }

  async moderateTribute(tributeId: string, status: ApprovalStatus, featured?: boolean) {
    return prisma.tributeMessage.update({
      where: { id: tributeId },
      data: {
        approvalStatus: status,
        ...(featured !== undefined ? { isFeatured: featured } : {}),
      },
    });
  }

  async getTributes(eventId: string, includePending = false, page = 1, limit = 20) {
    const { skip, limit: take } = parsePaginationInput({ page, limit });
    const where = {
      eventId,
      ...(includePending ? {} : { approvalStatus: "APPROVED" as ApprovalStatus }),
    };
    const [items, total] = await Promise.all([
      prisma.tributeMessage.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.tributeMessage.count({ where }),
    ]);
    return paginatedResult(items, total, page, take);
  }

  async lightCandle(eventId: string, userName: string, message?: string, country?: string) {
    return prisma.virtualCandle.create({
      data: { eventId, userName, message, country },
    });
  }

  async getCandles(eventId: string, page = 1, limit = 20) {
    const { skip, limit: take } = parsePaginationInput({ page, limit });
    const [items, total] = await Promise.all([
      prisma.virtualCandle.findMany({
        where: { eventId },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.virtualCandle.count({ where: { eventId } }),
    ]);
    return paginatedResult(items, total, page, take);
  }

  async addGuestbookEntry(
    eventId: string,
    userName: string,
    message: string,
    entryType: GuestbookEntryType = "CONDOLENCE",
    scriptureRef?: string
  ) {
    return prisma.memorialGuestbookEntry.create({
      data: { eventId, userName, message, entryType, scriptureRef, approvalStatus: "PENDING" },
    });
  }

  async moderateGuestbook(entryId: string, status: ApprovalStatus) {
    return prisma.memorialGuestbookEntry.update({
      where: { id: entryId },
      data: { approvalStatus: status },
    });
  }

  async getGuestbook(eventId: string, includePending = false, page = 1, limit = 20) {
    const { skip, limit: take } = parsePaginationInput({ page, limit });
    const where = {
      eventId,
      ...(includePending ? {} : { approvalStatus: "APPROVED" as ApprovalStatus }),
    };
    const [items, total] = await Promise.all([
      prisma.memorialGuestbookEntry.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.memorialGuestbookEntry.count({ where }),
    ]);
    return paginatedResult(items, total, page, take);
  }

  async addTimelineEntry(
    eventId: string,
    data: { year: number; title: string; description?: string; mediaUrl?: string; sortOrder?: number }
  ) {
    return prisma.memorialTimelineEntry.create({ data: { eventId, ...data } });
  }

  async deleteTimelineEntry(id: string) {
    return prisma.memorialTimelineEntry.delete({ where: { id } });
  }

  async getTimeline(eventId: string) {
    return prisma.memorialTimelineEntry.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: "asc" }, { year: "asc" }],
    });
  }

  async addLivestream(
    eventId: string,
    data: {
      title: string;
      provider: LivestreamProvider;
      streamUrl: string;
      scheduledAt?: string;
      isLive?: boolean;
      sortOrder?: number;
    }
  ) {
    return prisma.memorialLivestream.create({
      data: {
        eventId,
        title: data.title,
        provider: data.provider,
        streamUrl: data.streamUrl,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        isLive: data.isLive ?? false,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async deleteLivestream(id: string) {
    return prisma.memorialLivestream.delete({ where: { id } });
  }

  async getLivestreams(eventId: string) {
    return prisma.memorialLivestream.findMany({
      where: { eventId },
      orderBy: [{ isLive: "desc" }, { sortOrder: "asc" }],
    });
  }

  async addMediaItem(
    eventId: string,
    data: { kind: MemorialMediaKind; url: string; caption?: string; author?: string; autoApprove?: boolean }
  ) {
    return prisma.memorialMediaItem.create({
      data: {
        eventId,
        kind: data.kind,
        url: data.url,
        caption: data.caption,
        author: data.author,
        approvalStatus: data.autoApprove ? "APPROVED" : "PENDING",
      },
    });
  }

  async moderateMedia(id: string, status: ApprovalStatus) {
    return prisma.memorialMediaItem.update({
      where: { id },
      data: { approvalStatus: status },
    });
  }

  async getMedia(eventId: string, includePending = false, page = 1, limit = 20) {
    const { skip, limit: take } = parsePaginationInput({ page, limit });
    const where = {
      eventId,
      ...(includePending ? {} : { approvalStatus: "APPROVED" as ApprovalStatus }),
    };
    const [items, total] = await Promise.all([
      prisma.memorialMediaItem.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip,
        take,
      }),
      prisma.memorialMediaItem.count({ where }),
    ]);
    return paginatedResult(items, total, page, take);
  }

  async addFamilyMember(eventId: string, userId: string, role: FuneralFamilyRole = "MEMBER") {
    return prisma.funeralFamilyMember.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, role },
      update: { role },
    });
  }

  async getFamilyMembers(eventId: string) {
    return prisma.funeralFamilyMember.findMany({
      where: { eventId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async publishLegacyArchive(eventId: string, visibility: "PUBLIC" | "PRIVATE" | "FAMILY_ONLY" = "FAMILY_ONLY") {
    const [
      profile,
      tributes,
      timeline,
      guestbook,
      candles,
      gallery,
      contributions,
    ] = await Promise.all([
      prisma.funeralProfile.findUnique({ where: { eventId } }),
      prisma.tributeMessage.findMany({ where: { eventId, approvalStatus: "APPROVED" } }),
      prisma.memorialTimelineEntry.findMany({ where: { eventId } }),
      prisma.memorialGuestbookEntry.findMany({ where: { eventId, approvalStatus: "APPROVED" } }),
      prisma.virtualCandle.findMany({ where: { eventId }, take: 500 }),
      prisma.memorialMediaItem.findMany({ where: { eventId, approvalStatus: "APPROVED" } }),
      prisma.contribution.findMany({ where: { eventId } }),
    ]);

    const snapshot = {
      archivedAt: new Date().toISOString(),
      profile,
      tributes,
      timeline,
      guestbook,
      candles,
      gallery,
      contributions: contributions.map((c) => ({ ...c, amount: Number(c.amount) })),
    };

    return prisma.legacyArchive.upsert({
      where: { eventId },
      create: {
        eventId,
        visibility,
        snapshotJson: snapshot,
        publishedAt: new Date(),
      },
      update: {
        visibility,
        snapshotJson: snapshot,
        publishedAt: new Date(),
      },
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

  async getDashboardData(eventId: string) {
    const [
      profile,
      program,
      tributes,
      guestbook,
      candles,
      timeline,
      livestreams,
      media,
      family,
      legacy,
    ] = await Promise.all([
      this.getOrCreateProfile(eventId),
      this.getProgram(eventId),
      this.getTributes(eventId, true, 1, 20),
      this.getGuestbook(eventId, true, 1, 20),
      this.getCandles(eventId, 1, 20),
      this.getTimeline(eventId),
      this.getLivestreams(eventId),
      this.getMedia(eventId, true, 1, 20),
      this.getFamilyMembers(eventId),
      prisma.legacyArchive.findUnique({ where: { eventId } }),
    ]);

    return { profile, program, tributes, guestbook, candles, timeline, livestreams, media, family, legacy };
  }
}

export const funeralService = new FuneralService();
