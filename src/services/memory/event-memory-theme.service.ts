import { prisma } from "@/lib/prisma";
import { LIVE_PRODUCTION_ORDER_STATUSES } from "@/lib/invitation/studio-access";
import { isAureliaEditorialLayout } from "@/lib/experience/aurelia-editorial";
import {
  invitationLayoutSlug,
  resolveMemoryAlbumIdentity,
  type MemoryAlbumIdentity,
} from "@/lib/memory/memory-album-identity";
import {
  resolveMemoryTheme,
  serializeMemoryTheme,
  type MemoryTheme,
} from "@/lib/memory/memory-theme";
import type { InvitationDesignConfig } from "@/types/invitation-design";

export class EventMemoryThemeService {
  async resolveForEvent(
    eventId: string,
    event: { title: string; hostName: string } = { title: "", hostName: "" }
  ): Promise<{
    theme: MemoryTheme;
    templateSlug: string | null;
    publicTheme: ReturnType<typeof serializeMemoryTheme>;
    identity: MemoryAlbumIdentity;
  }> {
    const order = await prisma.invitationOrder.findFirst({
      where: {
        eventId,
        archivedAt: null,
        status: { in: [...LIVE_PRODUCTION_ORDER_STATUSES] },
        invitationId: { not: null },
        shareUrl: { not: null },
      },
      orderBy: { updatedAt: "desc" },
      select: { designConfig: true, templateSlug: true },
    });

    let design = (order?.designConfig as InvitationDesignConfig | null) ?? null;
    let templateSlug = order?.templateSlug ?? null;

    const invitation = await prisma.invitation.findFirst({
      where: { eventId, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      select: {
        designConfig: true,
        template: { select: { slug: true } },
      },
    });
    const invitationDesign = (invitation?.designConfig as InvitationDesignConfig | null) ?? null;
    if (!design) {
      design = invitationDesign;
    } else if (
      isAureliaEditorialLayout(invitationDesign?.layout) &&
      !isAureliaEditorialLayout(design.layout)
    ) {
      design = invitationDesign;
    }
    templateSlug =
      templateSlug ??
      invitationLayoutSlug(design, invitation?.template?.slug ?? null);

    const theme = resolveMemoryTheme({ design, templateSlug });
    const identity = resolveMemoryAlbumIdentity({
      eventTitle: event.title,
      hostName: event.hostName,
      design,
      templateSlug,
    });
    return { theme, templateSlug, publicTheme: serializeMemoryTheme(theme), identity };
  }
}

export const eventMemoryThemeService = new EventMemoryThemeService();
