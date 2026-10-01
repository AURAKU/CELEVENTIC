import {
  AURELIA_LAYOUT_SLUG,
  SERAPHINE_LAYOUT_SLUG,
} from "@/lib/experience/aurelia-editorial";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import { liveAlbumKey } from "./live-album";
import {
  resolveMemoryAlbumIdentity,
  type MemoryAlbumIdentity,
} from "./memory-album-identity";
import {
  memoryThemeToCssVars,
  resolveMemoryTheme,
  type MemoryThemeCssVars,
} from "./memory-theme";

export const LIVE_ALBUM_PREVIEW_LAYOUT: Record<string, string> = {
  "preview-seraphine-champagne-wedding": SERAPHINE_LAYOUT_SLUG,
  "preview-aurelia-editorial-wedding": AURELIA_LAYOUT_SLUG,
};

export type LiveAlbumPageChrome = {
  identity: MemoryAlbumIdentity;
  cssVars: MemoryThemeCssVars;
};

export function liveAlbumChromeFromDesign(input: {
  eventTitle: string;
  hostName: string;
  design?: Partial<InvitationDesignConfig> | null;
  templateSlug?: string | null;
}): LiveAlbumPageChrome {
  const identity = resolveMemoryAlbumIdentity(input);
  const theme = resolveMemoryTheme({
    design: input.design,
    templateSlug: input.templateSlug ?? identity.layout,
  });
  return {
    identity,
    cssVars: memoryThemeToCssVars(theme),
  };
}

export async function resolveLiveAlbumPageChrome(rawKey: string): Promise<LiveAlbumPageChrome> {
  const key = liveAlbumKey(rawKey);
  const previewLayout = LIVE_ALBUM_PREVIEW_LAYOUT[key];
  if (previewLayout) {
    return liveAlbumChromeFromDesign({
      eventTitle: "",
      hostName: "",
      design: { layout: previewLayout },
      templateSlug: previewLayout,
    });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const invitation = await prisma.invitation.findFirst({
      where: {
        OR: [{ id: key }, { uniqueLink: key }, { slug: key }],
        status: "ACTIVE",
      },
      select: {
        designConfig: true,
        template: { select: { slug: true } },
        event: { select: { title: true, hostName: true } },
      },
    });
    if (invitation) {
      return liveAlbumChromeFromDesign({
        eventTitle: invitation.event?.title ?? "",
        hostName: invitation.event?.hostName ?? "",
        design: (invitation.designConfig as InvitationDesignConfig | null) ?? null,
        templateSlug: invitation.template?.slug ?? null,
      });
    }
  } catch {
    /* Local preview often has no DATABASE_URL. */
  }

  return liveAlbumChromeFromDesign({
    eventTitle: "The shared album",
    hostName: "",
  });
}
