import React from "react";
import type { SocialPlaceCardVariant } from "@/lib/social/social-place-card";
import { SOCIAL_PLACE_CARD_PHRASE } from "@/lib/social/social-place-card";

export type SocialPlaceCardVisual = {
  variant: SocialPlaceCardVariant;
  title: string;
  dateLabel?: string | null;
  phrase?: string | null;
  heroSrc?: string | null;
  unavailable?: boolean;
};

const PALETTES = {
  aurelia: {
    panel: "linear-gradient(165deg, #0B241C 0%, #102E24 42%, #17382C 100%)",
    veil: "linear-gradient(90deg, rgba(8, 24, 18, 0) 0%, rgba(8, 24, 18, 0.28) 55%, rgba(11, 36, 28, 0.92) 100%)",
    ivory: "#F4EFE4",
    gold: "#C9B07A",
    muted: "rgba(244, 239, 228, 0.72)",
    mark: "rgba(201, 176, 122, 0.88)",
  },
  seraphine: {
    panel: "linear-gradient(165deg, #2C261C 0%, #3A3226 38%, #4A3F30 100%)",
    veil: "linear-gradient(90deg, rgba(44, 38, 28, 0) 0%, rgba(58, 50, 38, 0.22) 52%, rgba(58, 50, 38, 0.94) 100%)",
    ivory: "#F7F1E6",
    gold: "#D7C4A0",
    muted: "rgba(247, 241, 230, 0.74)",
    mark: "rgba(168, 186, 154, 0.92)",
  },
} as const;

function titleSize(title: string): number {
  if (title.length > 42) return 42;
  if (title.length > 28) return 50;
  if (title.length > 18) return 58;
  return 68;
}

export function SocialPlaceCardMarkup({
  variant,
  title,
  dateLabel,
  phrase,
  heroSrc,
  unavailable = false,
}: SocialPlaceCardVisual) {
  const palette = PALETTES[variant];
  const displayTitle = unavailable ? "This invitation is no longer available" : title;
  const displayPhrase = unavailable
    ? "The celebration link is closed."
    : phrase?.trim() || SOCIAL_PLACE_CARD_PHRASE;
  const size = unavailable ? 44 : titleSize(displayTitle);

  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: palette.panel,
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "58%",
          height: "630px",
          display: "flex",
          background:
            variant === "aurelia"
              ? "radial-gradient(circle at 30% 30%, #245544 0%, #0B241C 70%)"
              : "radial-gradient(circle at 30% 24%, #8BA888 0%, #3A3226 72%)",
        }}
      >
        {heroSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroSrc}
            alt=""
            width={700}
            height={630}
            style={{
              width: "100%",
              height: "630px",
              objectFit: "cover",
              objectPosition: "center 18%",
            }}
          />
        ) : null}
      </div>
      <div
        style={{
          position: "absolute",
          left: "42%",
          top: 0,
          width: "58%",
          height: "630px",
          background: palette.veil,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: "46%",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px 56px 56px 36px",
          background: palette.panel,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 18,
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            color: palette.gold,
            fontFamily: "Helvetica, Arial, sans-serif",
            marginBottom: 22,
          }}
        >
          YOU&apos;RE INVITED
        </div>
        <div
          style={{
            display: "flex",
            color: palette.ivory,
            fontSize: size,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            maxWidth: "500px",
          }}
        >
          {displayTitle}
        </div>
        {!unavailable && dateLabel ? (
          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontSize: 20,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: palette.gold,
              fontFamily: "Helvetica, Arial, sans-serif",
            }}
          >
            {dateLabel}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 24,
            lineHeight: 1.35,
            color: palette.muted,
            maxWidth: "460px",
          }}
        >
          {displayPhrase}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 40,
            color: palette.mark,
            fontFamily: "Helvetica, Arial, sans-serif",
          }}
        >
          <div style={{ display: "flex", fontSize: 13, letterSpacing: "0.38em" }}>CELEVENTIC</div>
          <div style={{ display: "flex", marginTop: 6, fontSize: 14, letterSpacing: "0.08em", opacity: 0.8 }}>
            Celebrate with Celeventic
          </div>
        </div>
      </div>
    </div>
  );
}
