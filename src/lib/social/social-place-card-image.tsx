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
const MAT = "#EFEAE1";

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
  const size = unavailable ? 40 : lockup ? 64 : titleSize(displayTitle, Boolean(greeting));
  const showPhrase = Boolean(displayPhrase) && (unavailable || !heroSrc || Boolean(greeting));
  const accent = readableAccent(palette.gold);
  const showPhoto = Boolean(heroSrc) && !unavailable;

  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        background: PAPER,
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      {showPhoto ? (
        <div
          style={{
            width: "548px",
            height: "630px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: MAT,
          }}
        >
          <div
            style={{
              width: "492px",
              height: "566px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#FBF9F5",
              borderRadius: 18,
              border: `1px solid ${accent}66`,
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroSrc ?? ""}
              alt=""
              width={492}
              height={566}
              style={{
                width: "492px",
                height: "566px",
                objectFit: "contain",
                objectPosition: "center",
              }}
            />
          </div>
        </div>
      ) : null}

      <div
        style={{
          width: showPhoto ? "652px" : "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: showPhoto ? "52px 56px 48px 48px" : "72px 88px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 13,
              letterSpacing: "0.42em",
              color: accent,
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
              background: accent,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {greeting ? (
            <div
              style={{
                display: "flex",
                color: "rgba(28, 25, 21, 0.62)",
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
                  color: INK,
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
                    color: accent,
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
                    color: INK,
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
                color: INK,
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
                color: accent,
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
                color: "rgba(28, 25, 21, 0.68)",
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
              background: accent,
              transform: "rotate(45deg)",
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 12,
              letterSpacing: "0.42em",
              color: accent,
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
