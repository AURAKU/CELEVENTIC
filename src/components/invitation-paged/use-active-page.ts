"use client";

import { useEffect, useState, type RefObject } from "react";
import { trackInviteEvent } from "@/lib/analytics/invite-events";
import type { InvitePageDef } from "@/lib/invite-blueprints/blueprint-types";

interface UseActivePageOptions {
  invitationId?: string;
  guestId?: string;
  templateSlug?: string;
  previewMode?: boolean;
}

/** Scroll a page into view, bypassing CSS smooth-scroll when instant. */
export function scrollToInvitePage(pageId: string, smooth = true) {
  const el = document.getElementById(pageId);
  if (!el) return;
  const scroller = el.closest<HTMLElement>(".inv-paged-scroll");
  if (!smooth && scroller) {
    const prev = scroller.style.scrollBehavior;
    scroller.style.scrollBehavior = "auto";
    el.scrollIntoView();
    scroller.style.scrollBehavior = prev;
    return;
  }
  el.scrollIntoView({ behavior: "smooth" });
}

/**
 * Active-page tracking for the paged viewer: IntersectionObserver drives the
 * dot rail + action bar, syncs the hash (deep links like #rsvp), and fires
 * one INVITE_PAGE_VIEW per page per session.
 */
export function useActivePage(
  containerRef: RefObject<HTMLDivElement | null>,
  pages: InvitePageDef[],
  opts: UseActivePageOptions
) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Deep-link landing + back/forward hash navigation.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && pages.some((p) => p.id === hash)) {
      scrollToInvitePage(hash, false);
    }
    function onHashChange() {
      const next = window.location.hash.replace("#", "");
      if (next && pages.some((p) => p.id === next)) {
        scrollToInvitePage(next);
      }
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [pages]);

  const { invitationId, guestId, templateSlug, previewMode } = opts;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const sections = Array.from(container.querySelectorAll<HTMLElement>("[data-inv-page]"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target.id;
          const index = pages.findIndex((p) => p.id === id);
          if (index < 0) continue;
          setActiveIndex(index);
          if (window.location.hash !== `#${id}`) {
            history.replaceState(null, "", `#${id}`);
          }
          if (!previewMode) {
            trackInviteEvent(
              {
                eventType: "INVITE_PAGE_VIEW",
                invitationId,
                guestId,
                templateSlug,
                metadata: { pageId: id, pageIndex: index },
              },
              `page:${invitationId}:${id}`
            );
          }
        }
      },
      { root: container, threshold: 0.55 }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [containerRef, pages, invitationId, guestId, templateSlug, previewMode]);

  return { activeIndex };
}
