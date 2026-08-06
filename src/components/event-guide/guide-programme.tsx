"use client";

import type { GuideAttachment, GuideProgrammeItem } from "@/lib/event-guide/types";
import { GuideAttachments } from "./guide-attachments";

type Fonts = { heading: string; body: string; eyebrow: string; script: string };

/**
 * The running order as a native timeline.
 *
 * A PDF is an attachment, never the primary rendering — a guest holding a phone
 * in a dim hall should not have to pinch-zoom a document to find when dinner is.
 */
export function GuideProgramme({
  items,
  attachments,
  fonts,
}: {
  items: GuideProgrammeItem[];
  attachments: GuideAttachment[];
  fonts: Fonts;
}) {
  if (items.length === 0) {
    return (
      <div
        data-testid="event-guide-programme-empty"
        className="rounded-2xl border px-5 py-8 text-center text-sm"
        style={{ borderColor: "var(--guide-hairline)", background: "var(--guide-paper)" }}
      >
        <p className="opacity-80">The order of service will appear here once the hosts publish it.</p>
        <GuideAttachments attachments={attachments} fonts={fonts} />
      </div>
    );
  }

  return (
    <section data-testid="event-guide-programme">
      <ol className="relative space-y-3">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="relative rounded-2xl border px-5 py-4"
            style={{ borderColor: "var(--guide-hairline)", background: "var(--guide-paper)" }}
          >
            <div className="flex items-baseline gap-3">
              <span
                aria-hidden
                className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: "var(--guide-secondary)" }}
              />
              <div className="min-w-0 flex-1">
                {item.time ? (
                  <p
                    className="text-[0.7rem] font-semibold uppercase tracking-[0.18em]"
                    style={{ fontFamily: fonts.eyebrow, color: "var(--guide-label, var(--guide-secondary))" }}
                  >
                    {item.time}
                  </p>
                ) : (
                  <p className="sr-only">Item {index + 1}</p>
                )}
                <p
                  className="mt-0.5 text-[1.05rem] leading-snug"
                  style={{ fontFamily: fonts.heading, color: "var(--guide-primary)" }}
                >
                  {item.title}
                </p>
                {item.description ? (
                  <p className="mt-1 text-[0.88rem] leading-relaxed opacity-80">
                    {item.description}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <GuideAttachments attachments={attachments} fonts={fonts} />
    </section>
  );
}
