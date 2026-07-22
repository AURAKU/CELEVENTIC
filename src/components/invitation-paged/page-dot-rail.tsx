"use client";

import { scrollToInvitePage } from "./use-active-page";
import type { InvitePageDef } from "@/lib/invite-blueprints/blueprint-types";

interface PageDotRailProps {
  pages: InvitePageDef[];
  activeIndex: number;
}

/** Right-edge progress rail; active dot takes the theme accent. 44px targets. */
export function PageDotRail({ pages, activeIndex }: PageDotRailProps) {
  if (pages.length < 2) return null;
  return (
    <nav className="inv-dot-rail inv-paged-chrome" aria-label="Invitation pages">
      {pages.map((page, index) => (
        <button
          key={page.id}
          type="button"
          className="inv-dot"
          data-active={index === activeIndex || undefined}
          aria-label={page.label}
          aria-current={index === activeIndex ? "page" : undefined}
          title={page.label}
          onClick={() => scrollToInvitePage(page.id)}
        />
      ))}
    </nav>
  );
}
