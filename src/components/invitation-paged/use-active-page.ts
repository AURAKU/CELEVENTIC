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

/**
 * Scroll a snap page into view inside `.inv-paged-scroll`.
 * Never use window scrollIntoView alone — the live invite shell is position:fixed,
 * so window scrolling breaks pagination / buttons on mobile.
 */
export function scrollToInvitePage(pageId: string, smooth = true) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(pageId);
  if (!el) return;
  const scroller = el.closest<HTMLElement>(".inv-paged-scroll");
  if (!scroller) {
    el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    return;
  }

  const elRect = el.getBoundingClientRect();
  const scrollerRect = scroller.getBoundingClientRect();
  const nextTop = scroller.scrollTop + (elRect.top - scrollerRect.top);

  scroller.scrollTo({
    top: Math.max(0, nextTop),
    behavior: smooth ? "smooth" : "auto",
  });
}

/**
 * After envelope / opening ceremony — always land on the cover (top),
 * never a mid or bottom page from peek / hash / snap glitches.
 */
export function resetInviteScrollToCover(options?: { smooth?: boolean; pageId?: string }) {
  if (typeof document === "undefined") return;
  const pageId = options?.pageId ?? "cover";
  const smooth = options?.smooth ?? false;

  try {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  } catch {
    /* ignore */
  }

  const scroller =
    document.querySelector<HTMLElement>(".inv-paged-scroll") ??
    document.getElementById(pageId)?.closest<HTMLElement>(".inv-paged-scroll");

  if (scroller) {
    scroller.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  if (document.getElementById(pageId)) {
    scrollToInvitePage(pageId, smooth);
  }

  try {
    if (window.location.hash !== `#${pageId}`) {
      history.replaceState(null, "", `#${pageId}`);
    }
  } catch {
    /* ignore */
  }
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
    // Fresh opens without a deep link always start on the cover.
    if (!hash || !pages.some((p) => p.id === hash)) {
      requestAnimationFrame(() => resetInviteScrollToCover({ smooth: false }));
      return;
    }
    // Wait a frame so layout/height are ready inside the fixed shell.
    requestAnimationFrame(() => scrollToInvitePage(hash, false));
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
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Under the envelope the portal is aria-hidden — do not rewrite hash /
        // active page from peek layout (that left guests on bottom pages).
        if (container.closest('[aria-hidden="true"]')) return;

        // Prefer the most visible intersecting page (mobile snap can report several).
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const best = visible[0];
        if (!best) return;
        const id = best.target.id;
        const index = pages.findIndex((p) => p.id === id);
        if (index < 0) return;
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
      },
      { root: container, threshold: [0.35, 0.55, 0.75] }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [containerRef, pages, invitationId, guestId, templateSlug, previewMode]);

  return { activeIndex };
}
