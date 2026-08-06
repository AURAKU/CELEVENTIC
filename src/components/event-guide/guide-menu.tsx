"use client";

import type { GuideAttachment, GuideMenu } from "@/lib/event-guide/types";
import { GuideAttachments } from "./guide-attachments";

type Fonts = { heading: string; body: string; eyebrow: string; script: string };

/**
 * The menu as a native page.
 *
 * Structured sections render as a card each; a free-text menu keeps the
 * organizer's own line breaks, which is how they wrote it and how a caterer
 * reads it back.
 */
export function GuideMenuPanel({
  menu,
  attachments,
  fonts,
}: {
  menu: GuideMenu;
  attachments: GuideAttachment[];
  fonts: Fonts;
}) {
  const hasContent = Boolean(menu.body.trim() || menu.sections.length > 0);

  return (
    <section data-testid="event-guide-menu">
      {menu.sections.length > 0 ? (
        <div className="space-y-3">
          {menu.sections.map((section) => (
            <div
              key={section.id}
              className="rounded-2xl border px-5 py-4"
              style={{ borderColor: "var(--guide-hairline)", background: "var(--guide-paper)" }}
            >
              <h2
                className="text-[0.72rem] font-semibold uppercase tracking-[0.22em]"
                style={{ fontFamily: fonts.eyebrow, color: "var(--guide-label, var(--guide-secondary))" }}
              >
                {section.heading}
              </h2>
              <ul className="mt-2.5 space-y-1.5">
                {section.items.map((item, index) => (
                  <li
                    key={`${section.id}-${index}`}
                    className="text-[0.95rem] leading-relaxed"
                    style={{ fontFamily: fonts.body }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {menu.body.trim() ? (
        <div
          className="mt-3 whitespace-pre-wrap rounded-2xl border px-5 py-4 text-[0.95rem] leading-relaxed"
          style={{ borderColor: "var(--guide-hairline)", background: "var(--guide-paper)" }}
        >
          {menu.body}
        </div>
      ) : null}

      {!hasContent ? (
        <div
          data-testid="event-guide-menu-empty"
          className="rounded-2xl border px-5 py-8 text-center text-sm"
          style={{ borderColor: "var(--guide-hairline)", background: "var(--guide-paper)" }}
        >
          <p className="opacity-80">The menu will appear here once the hosts publish it.</p>
        </div>
      ) : null}

      {menu.url ? (
        <a
          href={menu.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex text-[0.85rem] font-semibold underline-offset-4 hover:underline"
          style={{ color: "var(--guide-accent)" }}
        >
          Open the full menu
        </a>
      ) : null}

      <GuideAttachments attachments={attachments} fonts={fonts} />
    </section>
  );
}
