"use client";

import { useMemo } from "react";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import { resolveFeatureThemeTokens } from "@/lib/invitation-features/adapters";
import {
  buildPlaceCardViewModel,
  PLACE_CARD_FALLBACK_RECIPIENT,
  placeCardHasSeating,
  type PlaceCardConfig,
  type PlaceCardFrameStyle,
  type PlaceCardPartyState,
  type PlaceCardRecipientInput,
  type PlaceCardSeating,
  type PlaceCardTheme,
} from "@/lib/invitation-features/place-card";
import { GuestSeatingCard } from "@/components/seating/guest-seating-card";
import { cn } from "@/lib/utils";

/**
 * Personalised Place Card, the shared, template-agnostic implementation.
 *
 * There is exactly one of these for the whole platform. Presentation is
 * inherited from the template's feature adapter (colours, typography, border
 * radius, motion budget), so a new template picks the place card up for free
 * and an existing published invitation starts rendering it on the next view
 * without being re-published.
 */

interface PlaceCardProps {
  config: PlaceCardConfig;
  recipient: PlaceCardRecipientInput;
  party: PlaceCardPartyState;
  seating?: PlaceCardSeating | null;
  design: InvitationDesignConfig;
  className?: string;
}

/** Per-theme accents layered on top of the template's own tokens. */
const THEME_TREATMENT: Record<
  PlaceCardTheme,
  { letterSpacing: string; headingTransform: "uppercase" | "none"; ruleWidth: number }
> = {
  inherit: { letterSpacing: "0.22em", headingTransform: "none", ruleWidth: 1 },
  classic: { letterSpacing: "0.26em", headingTransform: "none", ruleWidth: 1 },
  elegant: { letterSpacing: "0.32em", headingTransform: "none", ruleWidth: 1 },
  modern: { letterSpacing: "0.14em", headingTransform: "uppercase", ruleWidth: 2 },
  festive: { letterSpacing: "0.2em", headingTransform: "none", ruleWidth: 3 },
};

function cardLift(ink: string): string {
  return `0 26px 46px -28px color-mix(in srgb, ${ink} 42%, transparent)`;
}

function cardFace(paper: string, metal: string): string {
  return [
    `radial-gradient(120% 70% at 50% -8%, color-mix(in srgb, ${metal} 18%, transparent), transparent 56%)`,
    `linear-gradient(180deg, color-mix(in srgb, white 22%, ${paper}) 0%, ${paper} 42%, color-mix(in srgb, ${metal} 8%, ${paper}) 100%)`,
  ].join(", ");
}

function cardRadius(frame: PlaceCardFrameStyle, radius: string): string {
  return frame === "soft" ? `calc(${radius} * 1.75)` : radius;
}

function paperFill(background: string, surface: string): string {
  if (isSolidColor(surface) && !isFaintColor(surface)) return surface;
  if (isSolidColor(background)) return background;
  return "#FFFDFA";
}

function isSolidColor(value: string | undefined): boolean {
  if (!value || value === "transparent") return false;
  return !value.includes("gradient(");
}

function isFaintColor(value: string): boolean {
  return /^#[0-9a-fA-F]{8}$/.test(value) && Number.parseInt(value.slice(7), 16) < 64;
}

function frameStyleFor(
  frame: PlaceCardFrameStyle,
  border: string,
  radius: string
): React.CSSProperties {
  const inner = `color-mix(in srgb, ${border} 72%, transparent)`;
  switch (frame) {
    case "none":
      return { borderRadius: radius };
    case "ornate":
      return {
        borderRadius: radius,
        boxShadow: `inset 0 0 0 1px ${border}, inset 0 0 0 8px transparent, inset 0 0 0 9px ${inner}`,
      };
    case "soft":
      return {
        border: `1px solid ${inner}`,
        borderRadius: `calc(${radius} * 1.75)`,
      };
    case "line":
    default:
      return {
        borderRadius: radius,
        boxShadow: `inset 0 0 0 1px ${border}, inset 0 0 0 8px transparent, inset 0 0 0 9px ${inner}`,
      };
  }
}

export function PlaceCard({
  config,
  recipient,
  party,
  seating,
  design,
  className,
}: PlaceCardProps) {
  const tokens = useMemo(() => resolveFeatureThemeTokens(design), [design]);
  const model = useMemo(
    () => buildPlaceCardViewModel(config, recipient, party),
    [config, recipient, party]
  );

  const treatment = THEME_TREATMENT[model.theme] ?? THEME_TREATMENT.inherit;
  const scriptSalutation =
    design.layout === "forever-afaris-wedding" ||
    design.layout === "traditional-marriage-ceremony";
  const fallbackGuest =
    model.recipientLine.localeCompare(PLACE_CARD_FALLBACK_RECIPIENT, undefined, {
      sensitivity: "accent",
    }) === 0;
  const showCapacity = Boolean(model.allowanceCopy) && tokens.hidePartyCapacity !== true;
  const showCorners = model.frameStyle !== "none";
  const paper = paperFill(tokens.background, tokens.surface);
  const radius = cardRadius(model.frameStyle, tokens.radius);
  // A template that asks for no motion always wins over the organiser's choice:
  // the template author knows the page is already carrying an animation budget.
  const motionClass =
    tokens.motion === "none" || model.animation === "none"
      ? undefined
      : model.animation === "shimmer"
        ? "inv-place-card-shimmer"
        : "inv-place-card-fade";

  return (
    <section
      aria-label="Your place card"
      className={cn("px-4 pt-8 pb-2", className)}
      data-testid="invitation-place-card"
    >
      <div
        className="relative mx-auto w-full max-w-[520px]"
        style={{ borderRadius: radius, boxShadow: cardLift(tokens.primary) }}
      >
        <div
          className={cn(
            "relative overflow-hidden px-7 py-10 text-center sm:px-10 sm:py-12",
            motionClass
          )}
          style={{
            background: cardFace(paper, tokens.secondary),
            color: tokens.text,
            fontFamily: tokens.fontBody,
            ...frameStyleFor(model.frameStyle, tokens.border, tokens.radius),
          }}
        >
          {showCorners && (
            <>
              <span aria-hidden className="inv-place-card__corner" data-corner="tl" style={{ borderColor: tokens.secondary }} />
              <span aria-hidden className="inv-place-card__corner" data-corner="tr" style={{ borderColor: tokens.secondary }} />
              <span aria-hidden className="inv-place-card__corner" data-corner="bl" style={{ borderColor: tokens.secondary }} />
              <span aria-hidden className="inv-place-card__corner" data-corner="br" style={{ borderColor: tokens.secondary }} />
            </>
          )}

          {model.monogram && (
            <p
              aria-hidden
              className={cn(
                "relative mx-auto mb-6 inline-flex items-center justify-center font-medium",
                model.monogram.includes("|")
                  ? "h-11 min-w-[5.4rem] px-3.5 text-[11px]"
                  : "h-12 w-12 text-[13px]"
              )}
              style={{
                borderRadius: 999,
                color: tokens.primary,
                fontFamily: tokens.fontHeading,
                letterSpacing: model.monogram.includes("|") ? "0.22em" : "0.08em",
                background: `linear-gradient(180deg, color-mix(in srgb, ${tokens.secondary} 16%, ${paper}), color-mix(in srgb, ${tokens.secondary} 6%, ${paper}))`,
                boxShadow: `inset 0 0 0 1px ${tokens.secondary}, inset 0 0 0 4px transparent, inset 0 0 0 5px ${tokens.secondary}`,
              }}
            >
              {model.monogram}
            </p>
          )}

          <div className="relative mx-auto flex max-w-[19rem] items-center justify-center gap-2.5">
            <span
              aria-hidden
              className="h-px w-5 shrink-0 sm:w-9"
              style={{ background: `linear-gradient(90deg, transparent, ${tokens.secondary})` }}
            />
            <p
              className="text-[10px] uppercase leading-snug sm:text-[11px]"
              style={{ color: tokens.primary, letterSpacing: treatment.letterSpacing }}
            >
              {model.heading}
            </p>
            <span
              aria-hidden
              className="h-px w-5 shrink-0 sm:w-9"
              style={{ background: `linear-gradient(90deg, ${tokens.secondary}, transparent)` }}
            />
          </div>

          {model.salutation && (
            <p
              className={cn(
                "relative mt-5 leading-none",
                scriptSalutation
                  ? "text-[2.35rem] sm:text-[2.7rem]"
                  : "text-lg italic sm:text-xl"
              )}
              style={{
                color: tokens.primary,
                fontFamily: scriptSalutation
                  ? "var(--font-great-vibes), 'Great Vibes', cursive"
                  : tokens.fontBody,
                fontWeight: 400,
              }}
            >
              {model.salutation}
            </p>
          )}

          <p
            className="relative mx-auto mt-1 max-w-[18rem] text-[clamp(1.28rem,4.8vw,1.7rem)] font-medium leading-[1.3] sm:max-w-[22rem]"
            style={{
              color: tokens.primary,
              fontFamily: tokens.fontHeading,
              textTransform: fallbackGuest ? "uppercase" : treatment.headingTransform,
              letterSpacing: fallbackGuest ? "0.16em" : "0.12em",
            }}
          >
            {model.recipientLine}
          </p>

          {showCapacity ? (
            <p
              className="relative mx-auto mt-4 max-w-[18rem] text-[1.05rem] italic leading-relaxed sm:text-[1.125rem]"
              style={{ color: tokens.text, fontFamily: tokens.fontBody }}
              data-testid="place-card-capacity"
            >
              {model.allowanceCopy}
            </p>
          ) : null}

          {placeCardHasSeating(seating) && seating && (
            <div className="relative mx-auto mt-5 w-full max-w-[22rem]" data-testid="place-card-seating">
              <GuestSeatingCard
                variant="placeCard"
                design={design}
                guestName={model.recipientLine}
                tableNumber={seating.reception?.tableNumber}
                seatLabel={seating.reception?.seatLabel}
                zone={seating.reception?.zone}
                receptionMode={seating.reception?.mode}
                ceremonyRowLabel={seating.ceremony?.rowLabel}
                ceremonySeatLabel={seating.ceremony?.seatLabel}
                ceremonyZone={seating.ceremony?.zone}
                allowance={party.allowance}
                settings={{ revealMode: "immediate", showFindMySeat: true }}
                className="shadow-none"
              />
            </div>
          )}

          {model.wording && (
            <p
              className="relative mx-auto mt-4 max-w-[26rem] text-sm leading-relaxed"
              style={{ color: tokens.text, opacity: 0.9 }}
            >
              {model.wording}
            </p>
          )}

          <div aria-hidden className="relative mx-auto mt-7 flex items-center justify-center gap-3">
            <span
              className="h-px w-12"
              style={{ background: `linear-gradient(90deg, transparent, ${tokens.secondary})` }}
            />
            <span
              className="h-1.5 w-1.5 rotate-45"
              style={{ background: tokens.secondary }}
            />
            <span
              className="h-px w-12"
              style={{ background: `linear-gradient(90deg, ${tokens.secondary}, transparent)` }}
            />
          </div>

          {model.supportingMessage && (
            <p
              className="relative mx-auto mt-5 max-w-[26rem] text-xs leading-relaxed"
              style={{ color: tokens.text, opacity: 0.75 }}
            >
              {model.supportingMessage}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
