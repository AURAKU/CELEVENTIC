import React from "react";
import type { SocialPlaceCardVariant } from "@/lib/social/social-place-card";
import { SOCIAL_PLACE_CARD_KICKER, SOCIAL_PLACE_CARD_PHRASE } from "@/lib/social/social-copy";
import { resolveSocialVisualTheme, type SocialVisualTheme } from "@/lib/social/social-theme";

export type SocialPlaceCardVisual = {
  variant?: SocialPlaceCardVariant | null;
  theme?: SocialVisualTheme | null;
  title: string;
  dateLabel?: string | null;
  phrase?: string | null;
  heroSrc?: string | null;
  unavailable?: boolean;
  unavailablePhrase?: string | null;
  kicker?: string | null;
  guestGreeting?: string | null;
};

function titleSize(title: string, personalized: boolean): number {
  if (title.length > 42) return personalized ? 38 : 42;
  if (title.length > 28) return personalized ? 46 : 50;
  if (title.length > 18) return personalized ? 52 : 58;
  return personalized ? 60 : 68;
}

export function SocialPlaceCardMarkup({
  variant,
  theme,
  title,
  dateLabel,
  phrase,
  heroSrc,
  unavailable = false,
  unavailablePhrase,
  kicker,
  guestGreeting,
}: SocialPlaceCardVisual) {
  const palette =
    theme ??
    resolveSocialVisualTheme({
      kind: "wedding",
      layoutSlug: variant === "seraphine" ? "seraphine-champagne-wedding" : variant === "aurelia" ? "aurelia-editorial-wedding" : null,
    });
  const greeting = unavailable ? null : guestGreeting?.trim() || null;
  const displayTitle = unavailable ? "This invitation is no longer available" : title;
  const displayPhrase = unavailable
    ? unavailablePhrase?.trim() || "This invitation is no longer available."
    : phrase?.trim() || SOCIAL_PLACE_CARD_PHRASE;
  const displayKicker = unavailable
    ? SOCIAL_PLACE_CARD_KICKER
    : kicker?.trim() || SOCIAL_PLACE_CARD_KICKER;
  const size = unavailable ? 44 : titleSize(displayTitle, Boolean(greeting));

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
          background: palette.heroWash,
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
          padding: greeting ? "56px 56px 48px 36px" : "64px 56px 56px 36px",
          background: palette.panel,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 15,
            letterSpacing: "0.38em",
            textTransform: "uppercase",
            color: palette.gold,
            fontFamily: "Helvetica, Arial, sans-serif",
            marginBottom: greeting ? 16 : 22,
          }}
        >
          {displayKicker}
        </div>
        {greeting ? (
          <div
            style={{
              display: "flex",
              color: palette.muted,
              fontSize: 26,
              fontStyle: "italic",
              lineHeight: 1.2,
              marginBottom: 14,
              maxWidth: "500px",
            }}
          >
            {greeting}
          </div>
        ) : null}
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
        <div
          style={{
            display: "flex",
            marginTop: greeting ? 18 : 28,
            fontSize: greeting ? 22 : 24,
            lineHeight: 1.35,
            color: palette.muted,
            maxWidth: "460px",
          }}
        >
          {displayPhrase}
        </div>
        {!unavailable && dateLabel ? (
          <div
            style={{
              display: "flex",
              marginTop: greeting ? 16 : 22,
              fontSize: 18,
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
            flexDirection: "column",
            marginTop: greeting ? 32 : 40,
            color: palette.mark,
            fontFamily: "Helvetica, Arial, sans-serif",
          }}
        >
          <div style={{ display: "flex", fontSize: 13, letterSpacing: "0.38em" }}>CELEVENTIC</div>
          <div style={{ display: "flex", marginTop: 6, fontSize: 14, letterSpacing: "0.08em", opacity: 0.8 }}>
            {unavailable
              ? "Celeventic"
              : (phrase ?? "").toLowerCase().includes("honour")
                ? "Remember with Celeventic"
                : "Celebrate with Celeventic"}
          </div>
        </div>
      </div>
    </div>
  );
}
