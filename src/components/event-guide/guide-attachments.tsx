"use client";

import type { GuideAttachment } from "@/lib/event-guide/types";

type Fonts = { eyebrow: string };

/**
 * Optional downloads shown beneath the native content.
 *
 * They never replace the on-page programme or menu — a link that needs a data
 * connection and a PDF reader is a fallback, not the experience.
 */
export function GuideAttachments({
  attachments,
  fonts,
}: {
  attachments: GuideAttachment[];
  fonts: Fonts;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="mt-6" data-testid="event-guide-attachments">
      <p
        className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] opacity-70"
        style={{ fontFamily: fonts.eyebrow }}
      >
        Also available
      </p>
      <ul className="mt-2 space-y-2">
        {attachments.map((attachment) => (
          <li key={attachment.url}>
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-[0.86rem] transition-opacity hover:opacity-80"
              style={{ borderColor: "var(--guide-hairline)" }}
            >
              <span className="min-w-0 truncate">{attachment.label}</span>
              <span className="shrink-0 text-[0.7rem] uppercase tracking-[0.14em] opacity-60">
                {attachment.kind === "image" ? "Image" : "PDF"}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
