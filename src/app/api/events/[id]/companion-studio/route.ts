import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireEventPermission } from "@/lib/workspace/event-access";
import { EventPermissionKey } from "@/lib/workspace/permission-keys";
import { rateLimit } from "@/lib/rate-limit";
import { createAuditLog } from "@/lib/audit";
import { resolveInvitationFeatures } from "@/services/invitation-features/feature-resolver";
import { resolveCompanionTheme } from "@/lib/admission/event-companion-theme";
import { buildPublishedDesignConfig } from "@/lib/invitation/published-design";
import { resolveProductionInvitationOrder } from "@/services/invitations/production-invitation-source.service";
import { LIVE_PRODUCTION_ORDER_STATUSES } from "@/lib/invitation/studio-access";
import { mergeWeddingBoard } from "@/lib/invitation/wedding-board";
import {
  COMPANION_STUDIO_FEATURE_KEYS,
  mergeCompanionFeatureConfig,
  parseProgrammeOutline,
  programmeItemsToOutline,
  readCompanionMenuConfig,
} from "@/lib/admission/companion-studio";
import { giftCampaignService } from "@/services/gifts/gift-campaign.service";
import { ALL_GUEST_FEATURE_KEYS, type GuestFeatureKey } from "@/lib/invitation-features/registry";
import { publishFeatureEvent } from "@/lib/invitation-features/events";
import type { InvitationDesignConfig } from "@/types/invitation-design";

export const dynamic = "force-dynamic";

const invitationStudioSelect = {
  id: true,
  uniqueLink: true,
  name: true,
  status: true,
  postAdmissionEnabled: true,
  featureConfig: true,
  designConfig: true,
  template: { select: { slug: true, config: true } },
} as const;

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

async function authorize(eventId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  try {
    await requireEventPermission(
      eventId,
      session.user.id,
      session.user.role,
      EventPermissionKey.EDIT_INVITATIONS
    );
  } catch {
    return {
      error: NextResponse.json(
        { error: "You do not have permission to edit the Event Companion" },
        { status: 403 }
      ),
    };
  }
  return { session };
}

/**
 * Always target the live Studio / production invitation for the event —
 * never the oldest personalized guest link that merely inherits an order.
 */
async function resolveStudioInvitation(eventId: string) {
  const liveOrder = await prisma.invitationOrder.findFirst({
    where: {
      eventId,
      archivedAt: null,
      status: { in: [...LIVE_PRODUCTION_ORDER_STATUSES] },
      invitationId: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      languageVersions: true,
      template: {
        include: {
          defaultMusicTrack: {
            select: {
              id: true,
              title: true,
              artist: true,
              url: true,
              durationSec: true,
              isActive: true,
            },
          },
        },
      },
    },
  });

  if (liveOrder?.invitationId) {
    const invitation = await prisma.invitation.findUnique({
      where: { id: liveOrder.invitationId },
      select: invitationStudioSelect,
    });
    if (invitation) {
      return { invitation, productionOrder: liveOrder };
    }
  }

  const invitations = await prisma.invitation.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    select: invitationStudioSelect,
  });
  if (!invitations.length) return null;

  for (const invitation of invitations) {
    const order = await resolveProductionInvitationOrder(invitation.id, eventId);
    if (order && order.invitationId === invitation.id) {
      return { invitation, productionOrder: order };
    }
  }

  const preferred =
    invitations.find((row) => row.postAdmissionEnabled) ??
    invitations.find((row) => row.status === "PUBLISHED" || row.status === "ACTIVE") ??
    invitations[0];

  return { invitation: preferred!, productionOrder: null };
}

/** Push companion keys + portal flag to every invite link for this event. */
async function fanOutCompanionConfig(input: {
  eventId: string;
  canonicalInvitationId: string;
  companionConfig: Record<string, unknown>;
  postAdmissionEnabled?: boolean;
}) {
  const rows = await prisma.invitation.findMany({
    where: { eventId: input.eventId },
    select: { id: true, uniqueLink: true, featureConfig: true },
  });

  await Promise.all(
    rows.map(async (row) => {
      const merged = mergeCompanionFeatureConfig(row.featureConfig, input.companionConfig);
      await prisma.invitation.update({
        where: { id: row.id },
        data: {
          featureConfig: merged as Prisma.InputJsonValue,
          ...(input.postAdmissionEnabled !== undefined
            ? { postAdmissionEnabled: input.postAdmissionEnabled }
            : {}),
          lastMigratedAt: new Date(),
        },
      });
      publishFeatureEvent("INVITATION_CONFIGURATION_UPDATED", {
        eventId: input.eventId,
        invitationId: row.id,
        invitationLink: row.uniqueLink,
        actorUserId: undefined,
        source: "companion-studio-fanout",
        canonicalInvitationId: input.canonicalInvitationId,
      });
    })
  );

  return rows.map((r) => r.uniqueLink);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const auth = await authorize(eventId);
  if (auth.error) return auth.error;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      eventType: true,
      coverImageUrl: true,
      startDate: true,
    },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const resolved = await resolveStudioInvitation(eventId);
  if (!resolved) {
    return NextResponse.json({
      success: true,
      data: {
        event,
        invitation: null,
        message: "Create an invitation for this event before editing the Event Companion.",
      },
    });
  }

  const { invitation, productionOrder } = resolved;
  const features = await resolveInvitationFeatures(invitation.id);
  const menuFeature = features.find((f) => f.key === "EVENT_MENU");
  const menu = readCompanionMenuConfig(menuFeature?.config);

  const designConfig = productionOrder
    ? buildPublishedDesignConfig(productionOrder)
    : invitation.designConfig;
  const theme = resolveCompanionTheme({
    designConfig,
    template: productionOrder
      ? {
          slug: productionOrder.templateSlug || productionOrder.template?.slug || "classic-gold",
          config: null,
        }
      : invitation.template,
    eventCoverImageUrl: event.coverImageUrl,
  });

  const gift = await giftCampaignService
    .resolveCompanionPlacement(eventId, { guestQrToken: null, companionReturnUrl: null })
    .catch(() => null);

  return NextResponse.json({
    success: true,
    data: {
      event,
      invitation: {
        id: invitation.id,
        uniqueLink: invitation.uniqueLink,
        name: invitation.name,
        postAdmissionEnabled: invitation.postAdmissionEnabled,
      },
      features: features.filter((f) =>
        (COMPANION_STUDIO_FEATURE_KEYS as readonly string[]).includes(f.key)
      ),
      menu,
      programmeItems: theme.programmeItems,
      programmeOutline: programmeItemsToOutline(theme.programmeItems),
      theme: {
        primary: theme.colors.primary,
        secondary: theme.colors.secondary,
        background: theme.colors.background,
        surface: theme.paperWash,
        text: theme.colors.text,
        fontHeading: theme.fonts.heading,
        fontBody: theme.fonts.body,
        identitySlug: theme.layout,
        heroImageUrl: theme.backgroundImageUrl,
      },
      gift: gift
        ? {
            giftUrl: gift.giftUrl,
            title: gift.title,
            teaser: gift.teaser,
          }
        : null,
      companionPreviewPath: `/invite/${encodeURIComponent(invitation.uniqueLink)}/event-day?preview=1`,
      giftsStudioPath: `/dashboard/gifts?eventId=${encodeURIComponent(eventId)}`,
      invitationStudioPath: `/dashboard/invitations?eventId=${encodeURIComponent(eventId)}`,
      qrAdmissionPath: `/dashboard/qr-admission?eventId=${encodeURIComponent(eventId)}`,
    },
  });
}

const patchSchema = z.object({
  postAdmissionEnabled: z.boolean().optional(),
  featureKey: z.enum(ALL_GUEST_FEATURE_KEYS as [GuestFeatureKey, ...GuestFeatureKey[]]).optional(),
  enabled: z.boolean().optional(),
  menuBody: z.string().max(12000).optional(),
  menuUrl: z.string().trim().max(2000).optional(),
  programmeOutline: z.string().max(20000).optional(),
  programmeItems: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        time: z.string().max(40),
        title: z.string().min(1).max(160),
        description: z.string().max(500).optional(),
      })
    )
    .max(80)
    .optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const auth = await authorize(eventId);
  if (auth.error) return auth.error;
  const { session } = auth;

  const rl = await rateLimit(`companion-studio:${session.user.id}:${clientIp(req)}`, 40, 60);
  if (!rl.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message ?? "Invalid request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const resolved = await resolveStudioInvitation(eventId);
  if (!resolved) {
    return NextResponse.json({ error: "No invitation found for this event" }, { status: 404 });
  }
  const { invitation, productionOrder } = resolved;

  const currentConfig = (invitation.featureConfig as Record<string, unknown> | null) ?? {};
  let nextConfig = { ...currentConfig };
  const designSource = (productionOrder
    ? buildPublishedDesignConfig(productionOrder)
    : invitation.designConfig) as InvitationDesignConfig | null;
  let nextDesign = (designSource ?? {}) as InvitationDesignConfig;
  let designChanged = false;
  let postAdmissionEnabled: boolean | undefined;

  if (body.postAdmissionEnabled !== undefined) {
    postAdmissionEnabled = body.postAdmissionEnabled;
    const portal = {
      ...((nextConfig.POST_ADMISSION_PORTAL as Record<string, unknown> | undefined) ?? {}),
      enabled: body.postAdmissionEnabled,
    };
    nextConfig = { ...nextConfig, POST_ADMISSION_PORTAL: portal };
  }

  if (body.featureKey && body.enabled !== undefined) {
    if (!(COMPANION_STUDIO_FEATURE_KEYS as readonly string[]).includes(body.featureKey)) {
      return NextResponse.json({ error: "Feature not available on Event Companion" }, { status: 400 });
    }
    const prev = (nextConfig[body.featureKey] as Record<string, unknown> | undefined) ?? {};
    nextConfig = {
      ...nextConfig,
      [body.featureKey]: { ...prev, enabled: body.enabled },
    };
    if (body.featureKey === "POST_ADMISSION_PORTAL") {
      postAdmissionEnabled = body.enabled;
    }
  }

  if (body.menuBody !== undefined || body.menuUrl !== undefined) {
    const prev = (nextConfig.EVENT_MENU as Record<string, unknown> | undefined) ?? {};
    const prevCfg = readCompanionMenuConfig(prev.config);
    const config = {
      menuBody: body.menuBody ?? prevCfg.menuBody,
      menuUrl: body.menuUrl ?? prevCfg.menuUrl,
    };
    nextConfig = {
      ...nextConfig,
      EVENT_MENU: {
        ...prev,
        enabled: prev.enabled === false ? false : true,
        config,
      },
    };
  }

  if (body.programmeOutline !== undefined || body.programmeItems !== undefined) {
    const items =
      body.programmeItems ??
      parseProgrammeOutline(body.programmeOutline ?? "");
    const studio = {
      ...((nextDesign.studio as Record<string, unknown> | undefined) ?? {}),
    };
    const existingBoard = mergeWeddingBoard(
      (studio.weddingBoard as Parameters<typeof mergeWeddingBoard>[0]) ?? undefined
    );
    studio.weddingBoard = {
      ...existingBoard,
      programmeItems: items,
      features: {
        ...existingBoard.features,
        programme: true,
      },
    };
    nextDesign = { ...nextDesign, studio: studio as InvitationDesignConfig["studio"] };
    designChanged = true;

    const prev = (nextConfig.LIVE_PROGRAMME as Record<string, unknown> | undefined) ?? {};
    nextConfig = {
      ...nextConfig,
      LIVE_PROGRAMME: {
        ...prev,
        enabled: prev.enabled === false ? false : true,
      },
    };
  }

  // Canonical invitation keeps programme/design; companion keys fan out to every link.
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: {
      ...(designChanged
        ? { designConfig: nextDesign as unknown as Prisma.InputJsonValue }
        : {}),
      lastMigratedAt: new Date(),
    },
  });

  const companionSlice: Record<string, unknown> = {};
  for (const key of COMPANION_STUDIO_FEATURE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(nextConfig, key)) {
      companionSlice[key] = nextConfig[key];
    }
  }

  await fanOutCompanionConfig({
    eventId,
    canonicalInvitationId: invitation.id,
    companionConfig: companionSlice,
    postAdmissionEnabled,
  });

  if (designChanged && productionOrder) {
    const orderDesign = (productionOrder.designConfig ?? {}) as InvitationDesignConfig;
    const orderStudio = {
      ...((orderDesign.studio as Record<string, unknown> | undefined) ?? {}),
      weddingBoard: (nextDesign.studio as { weddingBoard?: unknown } | undefined)?.weddingBoard,
    };
    await prisma.invitationOrder.update({
      where: { id: productionOrder.id },
      data: {
        designConfig: {
          ...orderDesign,
          studio: orderStudio,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  if (body.menuBody !== undefined || body.menuUrl !== undefined) {
    publishFeatureEvent("MENU_UPDATED", {
      eventId,
      invitationId: invitation.id,
      invitationLink: invitation.uniqueLink,
      actorUserId: session.user.id,
    });
  }
  if (body.programmeOutline !== undefined || body.programmeItems !== undefined) {
    publishFeatureEvent("PROGRAMME_UPDATED", {
      eventId,
      invitationId: invitation.id,
      invitationLink: invitation.uniqueLink,
      actorUserId: session.user.id,
    });
  }

  await createAuditLog({
    userId: session.user.id,
    action: "UPDATE",
    entity: "event_companion_studio",
    entityId: eventId,
    details: {
      invitationId: invitation.id,
      keys: Object.keys(body),
      fanOut: true,
    },
  });

  const refreshed = await GET(req, { params: Promise.resolve({ id: eventId }) });
  return refreshed;
}
