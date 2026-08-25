"use client";

import { Calendar, Clock, MapPin, Shirt, Users } from "lucide-react";
import { PageFrame } from "./page-frame";
import { MotifGlyph } from "./motif-glyph";
import { EntranceReveal } from "@/components/motion/entrance-reveal";
import { AddToCalendarBlock } from "./blocks/add-to-calendar-block";
import { MemorialMapPreview } from "./memorial-map-preview";
import { scrollToInvitePage } from "@/components/invitation-paged/use-active-page";
import { formatInvitationDateParts } from "@/lib/invitation-templates";
import {
  buildFuneralProgramme,
  formatFuneralDateLine,
  resolveDeceasedName,
} from "@/lib/invite-blueprints/funeral-invitation-copy";
import type { InvitePageProps } from "@/lib/invite-blueprints/blueprint-types";
import { buildDirectionsUrl } from "@/lib/invitation/maps-utils";

type DetailCard = {
  id: string;
  label: string;
  value: string;
  icon: typeof Calendar;
};

/** Prefer the main rites window over a midnight placeholder on the event start. */
function resolveFuneralKeyTime(
  dateParts: ReturnType<typeof formatInvitationDateParts> | null,
  programme: ReturnType<typeof buildFuneralProgramme>
): string | null {
  const rites = programme.find((s) => s.id === "final-rites");
  if (rites?.time?.trim()) return rites.time.trim();
  const fromRites = rites?.detail.match(/from\s+(.+)$/i)?.[1]?.trim();
  if (fromRites) return fromRites;

  const raw = dateParts?.time?.trim();
  if (!raw) return null;
  // Midnight UTC placeholders are not useful for guests.
  if (/^12:00\s*AM$/i.test(raw) || /^00:00/.test(raw)) return null;
  return raw;
}

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
  if (!isFuneral && event.hostName) {
    cards.push({ id: "host", label: "Hosted by", value: event.hostName, icon: Users });
  }

  if (isFuneral) {
    const keyTime = resolveFuneralKeyTime(dateParts, programme);
    const keyFacts: DetailCard[] = [];
    if (dateLine) {
      keyFacts.push({ id: "date", label: "When", value: dateLine, icon: Calendar });
    }
    if (keyTime) {
      keyFacts.push({ id: "time", label: "Time", value: keyTime, icon: Clock });
    }
    if (event.venueName) {
      keyFacts.push({ id: "venue", label: "Where", value: event.venueName, icon: MapPin });
    }
    const venueDirectionsUrl = buildDirectionsUrl({
      mapsLink: event.mapsLink,
      venueName: event.venueName,
      landmark: event.landmark,
    });
    const secondaryCards = cards.filter((c) => c.id === "dress");

    return (
      <PageFrame pageId={page.id} label={page.label} altSurface>
        <div className="inv-memorial-panel w-full">
          <EntranceReveal>
            <div className="inv-memorial-panel-header">
              <MotifGlyph glyphId={theme.motif.placements.coverTop} size={44} />
              <p className="inv-eyebrow">Funeral arrangements</p>
              <h2 className="inv-display inv-memorial-title">Programme</h2>
              <p className="inv-memorial-honour">
                <span className="inv-memorial-honour-lead">In honour of</span>
                <span className="inv-memorial-name inv-memorial-name--hero">{deceasedName}</span>
              </p>
            </div>
          </EntranceReveal>

          {keyFacts.length > 0 && (
            <EntranceReveal delay={0.05} className="w-full">
              <div className="inv-key-facts" role="group" aria-label="Date, time and venue">
                <dl className="inv-key-facts-list">
                  {keyFacts.map((fact) => {
                    const Icon = fact.icon;
                    const isVenueLink = fact.id === "venue" && venueDirectionsUrl;
                    return (
                      <div
                        key={fact.id}
                        className={
                          isVenueLink ? "inv-key-fact inv-key-fact--maps" : "inv-key-fact"
                        }
                        data-fact={fact.id}
                      >
                        <dt className="inv-key-fact-label">
                          <Icon size={18} strokeWidth={2.25} aria-hidden />
                          {fact.label}
                        </dt>
                        <dd className="inv-key-fact-value">{fact.value}</dd>
                        {isVenueLink ? (
                          <a
                            className="inv-key-fact-maps-hit"
                            href={venueDirectionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Get directions to ${fact.value} in Google Maps`}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </dl>
              </div>
            </EntranceReveal>
          )}

          <EntranceReveal delay={0.1} className="w-full">
            <p className="inv-eyebrow inv-programme-section-label">Order of service</p>
            <ol className="inv-programme-timeline" aria-label="Funeral programme">
              {programme.map((step, index) => (
                <li key={step.id} className="inv-programme-step">
                  <span className="inv-programme-marker" aria-hidden>
                    {step.step}
                  </span>
                  <div className="inv-programme-body">
                    <p className="inv-programme-title">{step.title}</p>
                    <p className="inv-programme-detail">
                      <span className="inv-programme-phrase inv-programme-phrase--date">
                        {step.date}
                      </span>
                      <span className="inv-programme-phrase inv-programme-phrase--place">
                        {step.place}
                      </span>
                      {step.time ? (
                        <span className="inv-programme-phrase inv-programme-phrase--time">
                          {step.time}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  {index < programme.length - 1 && (
                    <span className="inv-programme-connector" aria-hidden />
                  )}
                </li>
              ))}
            </ol>
          </EntranceReveal>

          {secondaryCards.length > 0 && (
            <EntranceReveal delay={0.14} className="w-full">
              <dl className="inv-detail-cards">
                {secondaryCards.map((card) => {
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
            <div className="inv-details-venue-stack">
              <button
                type="button"
                className="inv-btn inv-btn-secondary"
                onClick={() => scrollToInvitePage("venue")}
              >
                View venue & map
              </button>
              <MemorialMapPreview
                mapsLink={event.mapsLink}
                venueName={event.venueName}
                landmark={event.landmark}
              />
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
