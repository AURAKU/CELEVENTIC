"use client";

import { useMemo } from "react";
import type { InvitationDesignConfig } from "@/types/invitation-design";
import { resolveFeatureThemeTokens } from "@/lib/invitation-features/adapters";
import {
  buildPlaceCardViewModel,
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

function frameStyleFor(
  frame: PlaceCardFrameStyle,
  border: string,
  radius: string
): React.CSSProperties {
  switch (frame) {
    case "none":
      return { border: "none", borderRadius: radius };
    case "ornate":
      return {
        border: `1px solid ${border}`,
        // The inset ring is what reads as "engraved stationery" rather than a
        // web card; it is drawn with a shadow so it never affects layout.
        boxShadow: `inset 0 0 0 1px ${border}, inset 0 0 0 7px transparent, inset 0 0 0 8px ${border}`,
        borderRadius: radius,
      };
    case "soft":
      return {
        border: `1px solid ${border}`,
        borderRadius: `calc(${radius} * 1.75)`,
        boxShadow: "0 10px 30px -18px rgba(0,0,0,0.35)",
      };
    case "line":
    default:
      return { border: `1px solid ${border}`, borderRadius: radius };
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
        className={cn("relative mx-auto w-full max-w-[520px] px-6 py-8 text-center", motionClass)}
        style={{
          background: tokens.surface,
          color: tokens.text,
          fontFamily: tokens.fontBody,
          ...frameStyleFor(model.frameStyle, tokens.border, tokens.radius),
        }}
      >
        {model.monogram && (
          <p
            aria-hidden
            className={cn(
              "mx-auto mb-4 flex items-center justify-center rounded-full font-semibold",
              model.monogram.includes("|")
                ? "h-12 min-w-12 px-2 text-[11px]"
                : "h-11 w-11 text-[13px]"
            )}
            style={{
              border: `${treatment.ruleWidth}px solid ${tokens.secondary}`,
              color: tokens.primary,
              fontFamily: tokens.fontHeading,
              letterSpacing: model.monogram.includes("|") ? "0.02em" : "0.08em",
            }}
          >
            {model.monogram}
          </p>
        )}

        <p
          className="text-[10px] uppercase"
          style={{ color: tokens.secondary, letterSpacing: treatment.letterSpacing }}
        >
          {model.heading}
        </p>

        {model.salutation && (
          <p
            className="mt-4 text-lg font-medium leading-none sm:text-xl"
            style={{ color: tokens.text, opacity: 0.88 }}
          >
            {model.salutation}
          </p>
        )}

        <p
          className="mt-1 text-2xl leading-snug sm:text-[28px]"
          style={{
            color: tokens.primary,
            fontFamily: tokens.fontHeading,
            textTransform: treatment.headingTransform,
          }}
        >
          {model.recipientLine}
        </p>

        {model.allowanceCopy ? (
          <p
            className="mt-4 text-[13px] font-semibold sm:text-sm"
            style={{ color: tokens.primary, letterSpacing: "0.06em" }}
            data-testid="place-card-capacity"
          >
            {model.allowanceCopy}
          </p>
        ) : null}

        {placeCardHasSeating(seating) && seating && (
          <div className="mx-auto mt-5 w-full max-w-[22rem]" data-testid="place-card-seating">
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
            className="mx-auto mt-4 max-w-[26rem] text-sm leading-relaxed"
            style={{ color: tokens.text, opacity: 0.85 }}
          >
            {model.wording}
          </p>
        )}

        <div
          aria-hidden
          className="mx-auto mt-6 h-px w-16"
          style={{ background: tokens.secondary, opacity: 0.6 }}
        />

        {model.supportingMessage && (
          <p
            className="mx-auto mt-5 max-w-[26rem] text-xs leading-relaxed"
            style={{ color: tokens.text, opacity: 0.7 }}
          >
            {model.supportingMessage}
          </p>
        )}
      </div>
    </section>
  );
}
