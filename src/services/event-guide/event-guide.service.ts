import type { EventGuide, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getServerAppUrl } from "@/lib/app-url";
import { createAuditLog } from "@/lib/audit";
import { generatePublicLinkToken } from "@/lib/qr-hub/vendor-token";
import { validateCustomQrDestination } from "@/lib/qr-hub/types";
import { mergeWeddingBoard } from "@/lib/invitation/wedding-board";
import type { WeddingBoardProgrammeItem } from "@/lib/invitation/wedding-board";
import {
  latestUsableInvitationWhere,
  liveInvitationWhere,
} from "@/lib/invitation/live-invitation";
import {
  EVENT_GUIDE_PAYLOAD_FORMAT,
  type EventGuidePayload,
  type EventGuideTabKey,
} from "@/lib/event-guide/types";
import { formatGuideDate, resolveGuideContent } from "@/lib/event-guide/content";
import { assessGuideContrast, resolveGuideTheme } from "@/lib/event-guide/theme";
import { evaluateGuideAvailability } from "@/lib/event-guide/access";
import {
  effectiveMaxMatches,
  effectiveMinQuery,
  type SeatingMode,
} from "@/lib/event-guide/seating-finder";

const GUIDE_LINK_TITLE = "Event Guide";
const OFFLINE_LINK_TITLE = "Event Guide (venue offline)";

const TAB_TO_KEY: Record<string, EventGuideTabKey> = {
  PROGRAMME: "programme",
  SEATING: "seating",
  MENU: "menu",
};

const KEY_TO_TAB: Record<EventGuideTabKey, "PROGRAMME" | "SEATING" | "MENU"> = {
  programme: "PROGRAMME",
  seating: "SEATING",
  menu: "MENU",
};

export type GuideEventSummary = {
  id: string;
  title: string;
  hostName: string;
  startDate: Date;
  endDate: Date | null;
  venueName: string | null;
  status: string;
  coverImageUrl: string | null;
};

const EVENT_SELECT = {
  id: true,
  title: true,
  hostName: true,
  startDate: true,
  endDate: true,
  venueName: true,
  status: true,
  coverImageUrl: true,
} satisfies Prisma.EventSelect;

const INVITATION_SELECT = {
  designConfig: true,
  featureConfig: true,
  template: { select: { slug: true, config: true } },
} satisfies Prisma.InvitationSelect;

type GuideInvitation = Prisma.InvitationGetPayload<{ select: typeof INVITATION_SELECT }>;

export class EventGuideService {
  /** One guide row per event, created lazily the first time an organizer opens the builder. */
  async ensure(eventId: string, actorId?: string): Promise<EventGuide> {
    const existing = await prisma.eventGuide.findUnique({ where: { eventId } });
    if (existing) return existing;

    return prisma.eventGuide.upsert({
      where: { eventId },
      create: { eventId, createdById: actorId },
      update: {},
    });
  }

  /** The public Event Guide QR link, created on demand alongside the guide. */
  async ensureLink(eventId: string, actorId?: string) {
    const existing = await prisma.eventQrLink.findFirst({
      where: { eventId, type: "EVENT_GUIDE", title: GUIDE_LINK_TITLE },
    });
    if (existing) return existing;

    return prisma.eventQrLink.create({
      data: {
        eventId,
        type: "EVENT_GUIDE",
        publicToken: generatePublicLinkToken(),
        status: "ACTIVE",
        title: GUIDE_LINK_TITLE,
        heading: "Event Guide",
        subtitle: "Scan for the programme, your seat and the menu.",
        footerText: "Programme · Seating · Menu",
        createdById: actorId,
      },
    });
  }

  /**
   * The venue-offline QR link. Separate row, separate token, separate status —
   * rotating or revoking one never touches the other, and this one is only ever
   * created when the organizer explicitly configures a local address.
   */
  async setOfflineLink(eventId: string, localUrl: string | null, actorId: string) {
    const existing = await prisma.eventQrLink.findFirst({
      where: { eventId, type: "EVENT_GUIDE_OFFLINE", title: OFFLINE_LINK_TITLE },
    });

    if (!localUrl) {
      if (existing) {
        await prisma.eventQrLink.update({
          where: { id: existing.id },
          data: { status: "DISABLED" },
        });
      }
      return null;
    }

    const validated = validateCustomQrDestination(localUrl);
    if (!validated.ok) throw new Error(validated.error);

    if (existing) {
      return prisma.eventQrLink.update({
        where: { id: existing.id },
        data: { destinationUrl: validated.url, status: "ACTIVE" },
      });
    }

    return prisma.eventQrLink.create({
      data: {
        eventId,
        type: "EVENT_GUIDE_OFFLINE",
        publicToken: generatePublicLinkToken(),
        status: "ACTIVE",
        title: OFFLINE_LINK_TITLE,
        heading: "Event Guide — venue backup",
        subtitle: "Works only on the event Wi-Fi at this venue.",
        footerText: "Backup · Event Wi-Fi only",
        destinationUrl: validated.url,
        createdById: actorId,
      },
    });
  }

  async getEvent(eventId: string): Promise<GuideEventSummary | null> {
    return prisma.event.findUnique({ where: { id: eventId }, select: EVENT_SELECT });
  }

  /**
   * The live invitation whose theme and content the guide composes.
   *
   * Falls back to the most recent non-expired invitation so an organizer who
   * has not activated their invite yet still sees a themed guide in the builder
   * rather than the neutral fallback.
   */
  async getSourceInvitation(eventId: string): Promise<GuideInvitation | null> {
    const live = await prisma.invitation.findFirst({
      where: liveInvitationWhere(eventId),
      orderBy: { updatedAt: "desc" },
      select: INVITATION_SELECT,
    });
    if (live) return live;

    return prisma.invitation.findFirst({
      where: latestUsableInvitationWhere(eventId),
      orderBy: { updatedAt: "desc" },
      select: INVITATION_SELECT,
    });
  }

  invitationProgramme(invitation: GuideInvitation | null): WeddingBoardProgrammeItem[] {
    if (!invitation) return [];
    try {
      const design = invitation.designConfig as { studio?: Record<string, unknown> } | null;
      const studio = design?.studio as
        | { weddingBoard?: unknown; visionBoard?: { programmeItems?: WeddingBoardProgrammeItem[] } }
        | undefined;
      const fromBoard = mergeWeddingBoard(
        studio?.weddingBoard as Parameters<typeof mergeWeddingBoard>[0]
      ).programmeItems;
      if (fromBoard.length > 0) return fromBoard;
      return studio?.visionBoard?.programmeItems ?? [];
    } catch {
      return [];
    }
  }

  themeInput(invitation: GuideInvitation | null, event: GuideEventSummary) {
    if (!invitation) return null;
    return {
      designConfig: invitation.designConfig,
      template: invitation.template
        ? { slug: invitation.template.slug, config: invitation.template.config }
        : null,
      eventCoverImageUrl: event.coverImageUrl,
    };
  }

  /**
   * Build the guest-facing payload from current (draft) state.
   *
   * Every field is assigned explicitly — there is no spread of a database row
   * anywhere on this path, which is what keeps ids and contact details out of
   * the public surface by construction rather than by review.
   */
  buildPayload(input: {
    guide: EventGuide;
    event: GuideEventSummary;
    invitation: GuideInvitation | null;
    version: number;
    publishedAt: Date | null;
  }): EventGuidePayload {
    const { guide, event, invitation } = input;

    const content = resolveGuideContent({
      programmeDraft: guide.programmeDraft,
      menuDraft: guide.menuDraft,
      attachments: guide.attachments,
      invitationProgrammeItems: this.invitationProgramme(invitation),
      invitationFeatureConfig: invitation?.featureConfig,
    });

    const theme = resolveGuideTheme({
      useInvitationTheme: guide.useInvitationTheme,
      overrides: guide.themeOverrides,
      invitation: this.themeInput(invitation, event),
    });

    const seatingMode = guide.seatingMode as SeatingMode;

    return {
      format: EVENT_GUIDE_PAYLOAD_FORMAT,
      version: input.version,
      publishedAt: input.publishedAt?.toISOString() ?? null,
      defaultTab: TAB_TO_KEY[guide.defaultTab] ?? "programme",
      header: {
        eventTitle: event.title,
        celebrants: guide.showCelebrants
          ? (guide.celebrantsText?.trim() || event.hostName?.trim() || null)
          : null,
        dateLabel: guide.showDate ? formatGuideDate(event.startDate, event.endDate) : null,
        venue: guide.showVenue ? (event.venueName?.trim() || null) : null,
        welcome: guide.showWelcome ? (guide.welcomeMessage?.trim() || null) : null,
      },
      theme,
      programme: content.programme,
      menu: content.menu,
      attachments: content.attachments,
      seating: {
        enabled: guide.seatingEnabled,
        mode: seatingMode,
        minQueryLength: effectiveMinQuery(seatingMode, guide.seatingMinQuery),
        maxMatches: effectiveMaxMatches(guide.seatingMaxMatch),
        note: guide.seatingNote?.trim() || null,
      },
      offlineEnabled: guide.offlineEnabled,
    };
  }

  /** Draft preview for the builder — identical rendering, never public. */
  async previewPayload(eventId: string): Promise<EventGuidePayload | null> {
    const [guide, event] = await Promise.all([
      prisma.eventGuide.findUnique({ where: { eventId } }),
      this.getEvent(eventId),
    ]);
    if (!guide || !event) return null;
    const invitation = await this.getSourceInvitation(eventId);
    return this.buildPayload({
      guide,
      event,
      invitation,
      version: guide.version,
      publishedAt: guide.publishedAt,
    });
  }

  /**
   * Publish: freeze the current draft into an immutable snapshot.
   *
   * Contrast is validated server-side so the gate cannot be bypassed from the
   * client, and the guide link is activated in the same pass so a published
   * guide is never unreachable.
   */
  async publish(eventId: string, actorId: string, expectedVersion: number) {
    const guide = await prisma.eventGuide.findUnique({ where: { eventId } });
    if (!guide) throw new GuideError("Event Guide has not been set up yet", 404);
    this.assertVersion(guide, expectedVersion);

    const event = await this.getEvent(eventId);
    if (!event) throw new GuideError("Event not found", 404);

    const invitation = await this.getSourceInvitation(eventId);
    const publishedAt = new Date();
    const nextVersion = guide.version + 1;
    const payload = this.buildPayload({
      guide,
      event,
      invitation,
      version: nextVersion,
      publishedAt,
    });

    const contrast = assessGuideContrast(payload.theme);
    if (!contrast.passes) {
      const failing = contrast.findings
        .filter((f) => !f.passes)
        .map((f) => `${f.pair} is ${f.ratio}:1, needs ${f.required}:1`)
        .join("; ");
      throw new GuideError(
        `This colour combination is not readable enough to publish. ${failing}.`,
        422
      );
    }

    if (payload.programme.length === 0 && !payload.menu.body.trim() && !payload.menu.url) {
      throw new GuideError(
        "Add a programme or a menu before publishing — guests would see an empty guide.",
        422
      );
    }

    const [updated] = await prisma.$transaction([
      prisma.eventGuide.update({
        where: { eventId },
        data: {
          version: nextVersion,
          publishedVersion: nextVersion,
          publishedAt,
          publishedById: actorId,
          status: "PUBLISHED",
          enabled: true,
          publishedPayload: payload as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);

    const link = await this.ensureLink(eventId, actorId);
    if (link.status !== "ACTIVE") {
      await prisma.eventQrLink.update({ where: { id: link.id }, data: { status: "ACTIVE" } });
    }

    await createAuditLog({
      userId: actorId,
      action: "UPDATE",
      entity: "event_guide",
      entityId: updated.id,
      details: { eventId, event: "published", version: nextVersion },
    });

    return { guide: updated, payload, contrast };
  }

  async unpublish(eventId: string, actorId: string, expectedVersion: number) {
    const guide = await prisma.eventGuide.findUnique({ where: { eventId } });
    if (!guide) throw new GuideError("Event Guide has not been set up yet", 404);
    this.assertVersion(guide, expectedVersion);

    const updated = await prisma.eventGuide.update({
      where: { eventId },
      data: { status: "DRAFT", version: guide.version + 1 },
    });

    await createAuditLog({
      userId: actorId,
      action: "UPDATE",
      entity: "event_guide",
      entityId: updated.id,
      details: { eventId, event: "unpublished" },
    });

    return updated;
  }

  /**
   * Optimistic concurrency. A stale write is refused with the current version
   * so two organizers editing at once reconcile rather than clobber.
   */
  assertVersion(guide: EventGuide, expectedVersion: number) {
    if (!Number.isFinite(expectedVersion) || expectedVersion !== guide.version) {
      throw new GuideError(
        "Someone else updated this guide while you were editing. Reload to see their changes.",
        409
      );
    }
  }

  async applyUpdate(
    eventId: string,
    actorId: string,
    expectedVersion: number,
    data: Prisma.EventGuideUpdateInput,
    auditEvent: string
  ) {
    const guide = await prisma.eventGuide.findUnique({ where: { eventId } });
    if (!guide) throw new GuideError("Event Guide has not been set up yet", 404);
    this.assertVersion(guide, expectedVersion);

    const updated = await prisma.eventGuide.update({
      where: { eventId },
      data: { ...data, version: guide.version + 1 },
    });

    await createAuditLog({
      userId: actorId,
      action: "UPDATE",
      entity: "event_guide",
      entityId: updated.id,
      details: { eventId, event: auditEvent },
    });

    return updated;
  }

  /** Public read path: token → published payload, or a reason it is unavailable. */
  async resolvePublic(publicToken: string) {
    const link = await prisma.eventQrLink.findUnique({
      where: { publicToken },
      select: {
        id: true,
        type: true,
        status: true,
        eventId: true,
        expiresAt: true,
        event: { select: { status: true } },
      },
    });

    const guide = link
      ? await prisma.eventGuide.findUnique({ where: { eventId: link.eventId } })
      : null;

    const availability = evaluateGuideAvailability({
      link: link
        ? {
            type: link.type,
            status: link.status,
            eventId: link.eventId,
            expiresAt: link.expiresAt,
          }
        : null,
      guide: guide
        ? {
            eventId: guide.eventId,
            enabled: guide.enabled,
            status: guide.status,
            publishedVersion: guide.publishedVersion,
          }
        : null,
      eventStatus: link?.event.status ?? null,
    });

    if (!availability.available) {
      return { available: false as const, reason: availability.reason };
    }

    const payload = guide!.publishedPayload as unknown as EventGuidePayload | null;
    if (!payload || payload.format !== EVENT_GUIDE_PAYLOAD_FORMAT) {
      return { available: false as const, reason: "NOT_PUBLISHED" as const };
    }

    return {
      available: true as const,
      guideId: guide!.id,
      eventId: guide!.eventId,
      payload,
    };
  }

  async guideUrl(publicToken: string): Promise<string> {
    const base = await getServerAppUrl();
    return `${base}/event-guide/${publicToken}`;
  }

  /** Aggregate counters only — never a per-visitor row. */
  async recordActivity(input: {
    guideId: string;
    tab: EventGuideTabKey;
    channel?: "ONLINE" | "VENUE_OFFLINE";
    views?: number;
    searches?: number;
    matches?: number;
    day?: string;
  }) {
    const day = input.day ?? new Date().toISOString().slice(0, 10);
    const channel = input.channel ?? "ONLINE";
    const tab = KEY_TO_TAB[input.tab];
    const views = input.views ?? 0;
    const searches = input.searches ?? 0;
    const matches = input.matches ?? 0;

    await prisma.eventGuideViewStat.upsert({
      where: { guideId_day_tab_channel: { guideId: input.guideId, day, tab, channel } },
      create: { guideId: input.guideId, day, tab, channel, views, searches, matches },
      update: {
        views: { increment: views },
        searches: { increment: searches },
        matches: { increment: matches },
      },
    });
  }

  async analytics(guideId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const rows = await prisma.eventGuideViewStat.findMany({
      where: { guideId, day: { gte: since } },
      orderBy: [{ day: "desc" }],
      select: { day: true, tab: true, channel: true, views: true, searches: true, matches: true },
    });

    const totals = rows.reduce(
      (acc, row) => {
        acc.views += row.views;
        acc.searches += row.searches;
        acc.matches += row.matches;
        if (row.channel === "VENUE_OFFLINE") acc.offlineViews += row.views;
        return acc;
      },
      { views: 0, searches: 0, matches: 0, offlineViews: 0 }
    );

    return { rows, totals };
  }
}

export class GuideError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "GuideError";
  }
}

export const eventGuideService = new EventGuideService();
