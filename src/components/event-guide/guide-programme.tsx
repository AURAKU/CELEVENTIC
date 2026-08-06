"use client";

import type { GuideAttachment, GuideProgrammeItem } from "@/lib/event-guide/types";
import { GuideAttachments } from "./guide-attachments";

type Fonts = { heading: string; body: string; eyebrow: string; script: string };

/**
 * A detail is stored with the organizer's line breaks in it. Blank lines start
 * a new paragraph; single breaks stay breaks. A reading, a soloist and a note
 * about seating should not arrive as one run-on line.
 */
function toParagraphs(value: string): string[] {
  return value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

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
        {items.map((item, index) =>
          item.kind === "section" ? (
            /*
             * A heading the organizer wrote into their programme — `CEREMONY`,
             * `Reception`. It is a signpost between items, so it is set as one
             * rather than dressed up as a card that happens to have no time.
             */
            <li
              key={item.id}
              data-testid="event-guide-programme-section"
              className="flex items-center gap-3 px-1 pt-5 first:pt-1"
              dir="auto"
            >
              <span
                className="text-[0.68rem] font-semibold uppercase tracking-[0.24em]"
                style={{
                  fontFamily: fonts.eyebrow,
                  color: "var(--guide-label, var(--guide-secondary))",
                }}
              >
                {item.title}
              </span>
              <span
                aria-hidden
                className="h-px flex-1"
                style={{ background: "var(--guide-hairline)" }}
              />
            </li>
          ) : (
          <li
            key={item.id}
            className="relative rounded-2xl border px-5 py-4 sm:px-6 sm:py-5"
            style={{ borderColor: "var(--guide-hairline)", background: "var(--guide-paper)" }}
          >
            <div className="flex items-baseline gap-3">
              <span
                aria-hidden
                className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: "var(--guide-secondary)" }}
              />
              <div className="min-w-0 flex-1" dir="auto">
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
                  className="mt-1 text-[1.05rem] leading-snug"
                  style={{ fontFamily: fonts.heading, color: "var(--guide-primary)" }}
                >
                  {item.title}
                </p>
                {item.description
                  ? toParagraphs(item.description).map((paragraph, i) => (
                      <p
                        key={i}
                        className="mt-2 whitespace-pre-line text-[0.9rem] leading-[1.65] opacity-80"
                      >
                        {paragraph}
                      </p>
                    ))
                  : null}
              </div>
            </div>
          </li>
          )
        )}
      </ol>
      <GuideAttachments attachments={attachments} fonts={fonts} />
    </section>
  );
}
