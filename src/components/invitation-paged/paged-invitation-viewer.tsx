"use client";

import "@/components/invitation-pages/invitation-pages.css";

import { useEffect, useMemo, useRef, useState } from "react";
import { MotionProfileProvider } from "@/components/motion/motion-profile-provider";
import { PAGE_COMPONENTS } from "@/components/invitation-pages/page-registry";
import { getInviteBlueprint } from "@/lib/invite-blueprints/blueprint-registry";
import { themeToCssVars, themeToDataAttrs } from "@/lib/invitation-theme/theme-resolver";
import { detectDeviceTier, type DeviceTier } from "@/lib/motion/device-tier";
import { PageDotRail } from "./page-dot-rail";
import { PersistentActionBar } from "./persistent-action-bar";
import { SwipeHint } from "./swipe-hint";
import { useActivePage } from "./use-active-page";
import type { PageRenderContext } from "@/lib/invite-blueprints/blueprint-types";

export interface PagedInvitationViewerProps {
  context: PageRenderContext;
}

/**
 * Invitation Viewer 2.0 — pagination as the core model.
 *
 * Full-viewport pages with CSS scroll-snap, a tappable dot rail, a persistent
 * action bar from page 2, and per-page hash deep links. The full page tree is
 * SSR'd: with JS disabled the same content reads as a clean stacked scroll
 * (chrome stays hidden until hydration), and low-tier devices get plain
 * scrolling with the `still` motion profile.
 */
export function PagedInvitationViewer({ context }: PagedInvitationViewerProps) {
  const { theme, design } = context;
  const blueprint = getInviteBlueprint(design.blueprintId, context.category);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [tier, setTier] = useState<DeviceTier>("high");

  useEffect(() => {
    setHydrated(true);
    setTier(detectDeviceTier());
  }, []);

  // Optional pages with no content are dropped up front so the dot rail,
  // indices, and snap pages stay aligned.
  const pages = useMemo(
    () =>
      blueprint.pages.filter(
        (page) => page.type !== "story-tribute" || Boolean(context.event.description)
      ),
    [blueprint, context.event.description]
  );

  const { activeIndex } = useActivePage(containerRef, pages, {
    invitationId: context.invitation.id,
    guestId: context.guestId,
    templateSlug: context.templateSlug,
    previewMode: context.previewMode,
  });

  const hasRsvpPage = pages.some((page) => page.type === "rsvp");

  return (
    <div
      className="inv-paged-root"
      style={themeToCssVars(theme)}
      {...themeToDataAttrs(theme)}
      data-hydrated={hydrated ? "true" : "false"}
      data-tier={tier}
    >
      <MotionProfileProvider
        profileId={theme.motion.profileId}
        intensity={theme.motion.intensity}
        scrollContainerRef={containerRef}
      >
        <div className="inv-paged-scroll" ref={containerRef}>
          {pages.map((page, index) => {
            const PageComponent = PAGE_COMPONENTS[page.type];
            return <PageComponent key={page.id} context={context} page={page} index={index} />;
          })}
        </div>
        <PageDotRail pages={pages} activeIndex={activeIndex} />
        <PersistentActionBar context={context} visible={activeIndex >= 1} hasRsvpPage={hasRsvpPage} />
        {activeIndex === 0 && pages.length > 1 && <SwipeHint />}
      </MotionProfileProvider>
    </div>
  );
}
