import { prisma } from "@/lib/prisma";
import { LIVE_PRODUCTION_ORDER_STATUSES } from "@/lib/invitation/studio-access";
import {
  resolveMemoryTheme,
  serializeMemoryTheme,
  type MemoryTheme,
} from "@/lib/memory/memory-theme";
import type { InvitationDesignConfig } from "@/types/invitation-design";

export class EventMemoryThemeService {
  async resolveForEvent(eventId: string): Promise<{
    theme: MemoryTheme;
    templateSlug: string | null;
    publicTheme: ReturnType<typeof serializeMemoryTheme>;
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

    if (!design) {
      const invitation = await prisma.invitation.findFirst({
        where: { eventId, status: "ACTIVE" },
        orderBy: { updatedAt: "desc" },
        select: {
          designConfig: true,
          template: { select: { slug: true } },
        },
      });
      design = (invitation?.designConfig as InvitationDesignConfig | null) ?? null;
      templateSlug = templateSlug ?? invitation?.template?.slug ?? null;
    }

    const theme = resolveMemoryTheme({ design, templateSlug });
    return { theme, templateSlug, publicTheme: serializeMemoryTheme(theme) };
  }
}

export const eventMemoryThemeService = new EventMemoryThemeService();
