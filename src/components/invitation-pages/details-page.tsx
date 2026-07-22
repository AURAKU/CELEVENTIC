"use client";

import { PageFrame } from "./page-frame";
import { MotifGlyph } from "./motif-glyph";
import { EntranceReveal } from "@/components/motion/entrance-reveal";
import { AddToCalendarBlock } from "./blocks/add-to-calendar-block";
import { formatInvitationDateParts } from "@/lib/invitation-templates";
import type { InvitePageProps } from "@/lib/invite-blueprints/blueprint-types";

export function DetailsPage({ context, page }: InvitePageProps) {
  const { event, theme, category } = context;
  const dateParts = event.startDateRaw ? formatInvitationDateParts(event.startDateRaw) : null;

  const rows: Array<{ label: string; value: string }> = [];
  if (dateParts) {
    rows.push({
      label: "Date",
      value: `${dateParts.weekday}, ${dateParts.month} ${dateParts.day}, ${dateParts.year}`,
    });
    rows.push({ label: "Time", value: dateParts.time });
  } else if (event.startDate) {
    rows.push({ label: "Date", value: event.startDate });
  }
  if (event.venueName) rows.push({ label: "Venue", value: event.venueName });
  if (event.dressCode) rows.push({ label: "Dress code", value: event.dressCode });
  if (event.hostName) {
    rows.push({ label: category === "funeral" ? "By" : "Hosted by", value: event.hostName });
  }

  return (
    <PageFrame pageId={page.id} label={page.label} altSurface>
      <EntranceReveal>
        <p className="inv-eyebrow">{category === "funeral" ? "Arrangements" : "The details"}</p>
        <h2 className="inv-heading">
          {category === "funeral" ? "Order of the day" : "When & where"}
        </h2>
      </EntranceReveal>
      <EntranceReveal delay={0.08} className="w-full">
        <dl className="w-full">
          {rows.map((row) => (
            <div key={row.label} className="inv-detail-row">
              <dt className="inv-eyebrow">{row.label}</dt>
              <dd className="inv-body">{row.value}</dd>
            </div>
          ))}
        </dl>
      </EntranceReveal>
      <EntranceReveal delay={0.16}>
        <AddToCalendarBlock context={context} />
      </EntranceReveal>
      <div className="inv-divider">
        <MotifGlyph glyphId={theme.motif.placements.divider} size={36} />
      </div>
    </PageFrame>
  );
}
