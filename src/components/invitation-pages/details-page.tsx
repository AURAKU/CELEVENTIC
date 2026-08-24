"use client";

import { Calendar, Clock, MapPin, Shirt, Users } from "lucide-react";
import { PageFrame } from "./page-frame";
import { MotifGlyph } from "./motif-glyph";
import { EntranceReveal } from "@/components/motion/entrance-reveal";
import { AddToCalendarBlock } from "./blocks/add-to-calendar-block";
import { scrollToInvitePage } from "@/components/invitation-paged/use-active-page";
import { formatInvitationDateParts } from "@/lib/invitation-templates";
import {
  buildFuneralProgramme,
  formatFuneralDateLine,
  resolveDeceasedName,
} from "@/lib/invite-blueprints/funeral-invitation-copy";
import type { InvitePageProps } from "@/lib/invite-blueprints/blueprint-types";

type DetailCard = {
  id: string;
  label: string;
  value: string;
  icon: typeof Calendar;
};

export function DetailsPage({ context, page }: InvitePageProps) {
  const { event, theme, category, invitation } = context;
  const isFuneral = category === "funeral";
  const dateParts = event.startDateRaw ? formatInvitationDateParts(event.startDateRaw) : null;
  const deceasedName = isFuneral ? resolveDeceasedName(event) : null;
  const programme = isFuneral ? buildFuneralProgramme(event, dateParts) : [];

  const cards: DetailCard[] = [];
  const dateLine = formatFuneralDateLine(dateParts, event.startDate);
  if (dateLine) {
    cards.push({ id: "date", label: "Date", value: dateLine, icon: Calendar });
  }
  if (dateParts?.time) {
    cards.push({ id: "time", label: "Time", value: dateParts.time, icon: Clock });
  }
  if (event.venueName) {
    cards.push({ id: "venue", label: "Venue", value: event.venueName, icon: MapPin });
  }
  if (event.dressCode) {
    cards.push({ id: "dress", label: "Dress code", value: event.dressCode, icon: Shirt });
  }
  if (isFuneral && deceasedName) {
    cards.push({
      id: "family",
      label: "Arranged by",
      value: `The family of ${deceasedName}`,
      icon: Users,
    });
  } else if (event.hostName) {
    cards.push({ id: "host", label: "Hosted by", value: event.hostName, icon: Users });
  }

  if (isFuneral) {
    return (
      <PageFrame pageId={page.id} label={page.label} altSurface>
        <div className="inv-memorial-panel w-full">
          <EntranceReveal>
            <div className="inv-memorial-panel-header">
              <MotifGlyph glyphId={theme.motif.placements.coverTop} size={44} />
              <p className="inv-eyebrow">Arrangements</p>
              <h2 className="inv-heading">Order of the day</h2>
              <p className="inv-body inv-muted inv-memorial-lead">
                In honour of <span className="inv-memorial-name">{deceasedName}</span>
              </p>
            </div>
          </EntranceReveal>

          <EntranceReveal delay={0.06} className="w-full">
            <ol className="inv-programme-timeline" aria-label="Funeral programme">
              {programme.map((step, index) => (
                <li key={step.id} className="inv-programme-step">
                  <span className="inv-programme-marker" aria-hidden>
                    {step.step}
                  </span>
                  <div className="inv-programme-body">
                    <p className="inv-programme-title">{step.title}</p>
                    <p className="inv-programme-detail">{step.detail}</p>
                  </div>
                  {index < programme.length - 1 && (
                    <span className="inv-programme-connector" aria-hidden />
                  )}
                </li>
              ))}
            </ol>
          </EntranceReveal>

          {cards.length > 0 && (
            <EntranceReveal delay={0.12} className="w-full">
              <p className="inv-eyebrow inv-programme-section-label">Service details</p>
              <dl className="inv-detail-cards">
                {cards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.id} className="inv-detail-card">
                      <dt className="inv-detail-card-label">
                        <Icon size={15} aria-hidden />
                        {card.label}
                      </dt>
                      <dd className="inv-detail-card-value">{card.value}</dd>
                    </div>
                  );
                })}
              </dl>
            </EntranceReveal>
          )}

          {invitation.message && (
            <EntranceReveal delay={0.16}>
              <blockquote className="inv-memorial-quote">{invitation.message}</blockquote>
            </EntranceReveal>
          )}

          {event.contactPhone && (
            <EntranceReveal delay={0.18}>
              <p className="inv-body inv-muted inv-memorial-contact">
                Family contact:{" "}
                <a href={`tel:${event.contactPhone.replace(/\s+/g, "")}`} className="inv-link">
                  {event.contactPhone}
                </a>
              </p>
            </EntranceReveal>
          )}

          <EntranceReveal delay={0.2} className="w-full">
            <AddToCalendarBlock context={context} />
          </EntranceReveal>

          <EntranceReveal delay={0.24} className="w-full">
            <div className="inv-cover-quick-nav">
              <button
                type="button"
                className="inv-btn inv-btn-secondary"
                onClick={() => scrollToInvitePage("venue")}
              >
                View venue & map
              </button>
              <button
                type="button"
                className="inv-btn inv-btn-primary"
                onClick={() => scrollToInvitePage("rsvp")}
              >
                Confirm attendance
              </button>
            </div>
          </EntranceReveal>

          <div className="inv-divider">
            <MotifGlyph glyphId={theme.motif.placements.divider} size={36} />
          </div>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame pageId={page.id} label={page.label} altSurface>
      <EntranceReveal>
        <p className="inv-eyebrow">The details</p>
        <h2 className="inv-heading">When & where</h2>
      </EntranceReveal>
      <EntranceReveal delay={0.08} className="w-full">
        <dl className="inv-detail-cards">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.id} className="inv-detail-card">
                <dt className="inv-detail-card-label">
                  <Icon size={15} aria-hidden />
                  {card.label}
                </dt>
                <dd className="inv-detail-card-value">{card.value}</dd>
              </div>
            );
          })}
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
