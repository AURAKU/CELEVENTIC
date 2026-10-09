import React from "react";
import type { SocialPlaceCardVariant } from "@/lib/social/social-place-card";
import { SOCIAL_PLACE_CARD_KICKER } from "@/lib/social/social-copy";
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

const INK = "#1C1915";
const PAPER = "#F7F3EC";

function titleSize(title: string, personalized: boolean): number {
  if (title.length > 42) return personalized ? 34 : 38;
  if (title.length > 28) return personalized ? 40 : 46;
  if (title.length > 18) return personalized ? 48 : 54;
  return personalized ? 54 : 62;
}

/** Theme accents are often too pale on ivory. Darken until small type stays readable. */
function readableAccent(accent: string): string {
  const hex = accent.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return "#6F5A38";
  const channels = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16));
  const luminance = (0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]) / 255;
  if (luminance < 0.45) return `#${hex}`;
  return channels
    .map((channel) => Math.max(0, Math.round(channel * 0.62)).toString(16).padStart(2, "0"))
    .reduce((hexColor, channel) => hexColor + channel, "#");
}

function coupleLockup(title: string): { one: string; two: string } | null {
  const parts = title.split(/\s+&\s+/);
  if (parts.length !== 2) return null;
  const one = parts[0]?.trim() ?? "";
  const two = parts[1]?.trim() ?? "";
  if (!one || !two) return null;
  if (one.length > 16 || two.length > 16) return null;
  return { one, two };
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
      layoutSlug:
        variant === "seraphine"
          ? "seraphine-champagne-wedding"
          : variant === "aurelia"
            ? "aurelia-editorial-wedding"
            : null,
    });
  const greeting = unavailable ? null : guestGreeting?.trim() || null;
  const displayTitle = unavailable ? "This invitation is no longer available" : title;
  const displayPhrase = unavailable
    ? unavailablePhrase?.trim() || "This invitation is no longer available."
    : phrase?.trim() || "";
  const displayKicker = unavailable
    ? SOCIAL_PLACE_CARD_KICKER
    : kicker?.trim() || SOCIAL_PLACE_CARD_KICKER;
  const lockup = unavailable ? null : coupleLockup(displayTitle);
  const accent = readableAccent(palette.gold);
  const showPhoto = Boolean(heroSrc) && !unavailable;
  const size = unavailable ? 40 : lockup ? (showPhoto ? 52 : 64) : titleSize(displayTitle, Boolean(greeting));
  const showPhrase = Boolean(displayPhrase) && !showPhoto;
  const ink = showPhoto ? "#FFF8EE" : INK;
  const quiet = showPhoto ? "rgba(255, 248, 238, 0.82)" : "rgba(28, 25, 21, 0.62)";
  const mark = showPhoto ? "#E6D2A2" : accent;

  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        position: "relative",
        background: PAPER,
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      {showPhoto ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "1200px",
            height: "630px",
            display: "flex",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroSrc ?? ""}
            alt=""
            width={1200}
            height={630}
            style={{
              width: "1200px",
              height: "630px",
              objectFit: "cover",
              objectPosition: "center 22%",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "1200px",
              height: "630px",
              display: "flex",
              background:
                "linear-gradient(180deg, rgba(18, 12, 8, 0.06) 0%, rgba(18, 12, 8, 0.02) 38%, rgba(18, 12, 8, 0.72) 100%)",
            }}
          />
        </div>
      ) : null}

      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: showPhoto ? "flex-end" : "space-between",
          padding: showPhoto ? "48px 64px 46px" : "72px 88px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 13,
              letterSpacing: "0.42em",
              color: mark,
              fontFamily: "Helvetica, Arial, sans-serif",
            }}
          >
            {displayKicker}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 14,
              width: 42,
              height: 1,
              background: mark,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {greeting ? (
            <div
              style={{
                display: "flex",
                color: quiet,
                fontSize: 22,
                fontStyle: "italic",
                lineHeight: 1.2,
                marginBottom: 12,
              }}
            >
              {greeting}
            </div>
          ) : null}

          {lockup ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  color: ink,
                  fontSize: size,
                  lineHeight: 0.94,
                  letterSpacing: "-0.03em",
                }}
              >
                {lockup.one}
              </div>
              <div style={{ display: "flex", alignItems: "center", marginTop: 4 }}>
                <div
                  style={{
                    display: "flex",
                    color: mark,
                    fontSize: Math.round(size * 0.62),
                    lineHeight: 0.9,
                    marginRight: 14,
                  }}
                >
                  &
                </div>
                <div
                  style={{
                    display: "flex",
                    color: ink,
                    fontSize: size,
                    lineHeight: 0.94,
                    letterSpacing: "-0.03em",
                  }}
                >
                  {lockup.two}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                color: ink,
                fontSize: size,
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
                maxWidth: showPhoto ? "540px" : "900px",
              }}
            >
              {displayTitle}
            </div>
          )}

          {dateLabel && !unavailable ? (
            <div
              style={{
                display: "flex",
                marginTop: 18,
                color: mark,
                fontSize: 15,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                fontFamily: "Helvetica, Arial, sans-serif",
              }}
            >
              {dateLabel}
            </div>
          ) : null}

          {showPhrase ? (
            <div
              style={{
                display: "flex",
                marginTop: 16,
                fontSize: 22,
                lineHeight: 1.35,
                color: quiet,
                maxWidth: showPhoto ? "520px" : "760px",
              }}
            >
              {displayPhrase}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              width: 6,
              height: 6,
              marginRight: 12,
              background: mark,
              transform: "rotate(45deg)",
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 12,
              letterSpacing: "0.42em",
              color: mark,
              fontFamily: "Helvetica, Arial, sans-serif",
            }}
          >
            CELEVENTIC
          </div>
        </div>
      </div>
    </div>
  );
}
