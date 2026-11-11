import React from "react";
import type { SocialPlaceCardVariant } from "@/lib/social/social-place-card";
import { SOCIAL_PLACE_CARD_KICKER } from "@/lib/social/social-copy";
import { resolveSocialVisualTheme, type SocialVisualTheme } from "@/lib/social/social-theme";

export type SocialPlaceCardVisual = {
  variant?: SocialPlaceCardVariant | null;
  theme?: SocialVisualTheme | null;
  title: string;
  dateLabel?: string | null;
  dateLines?: string[] | null;
  phrase?: string | null;
  heroSrc?: string | null;
  unavailable?: boolean;
  unavailablePhrase?: string | null;
  kicker?: string | null;
  guestGreeting?: string | null;
  /** `cover-top` fills a wide panel from the heads down. Default keeps the full photo. */
  heroFit?: "contain" | "cover-top" | null;
};

const INK = "#1C1915";
const PAPER = "#F7F3EC";
const PHOTO_W = 420;

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

function firstName(value: string): string {
  return value.trim().split(/\s+/)[0] ?? value;
}

function coupleLockup(title: string): { one: string; two: string } | null {
  const parts = title.split(/\s+&\s+|\s+and\s+/i);
  if (parts.length !== 2) return null;
  let one = parts[0]?.trim() ?? "";
  let two = parts[1]?.trim() ?? "";
  if (!one || !two) return null;
  const words = (value: string) => value.split(/\s+/).filter(Boolean).length;
  if (words(one) > 3 || words(two) > 3) return null;
  if (one.length > 16) one = firstName(one);
  if (two.length > 16) two = firstName(two);
  if (!one || !two) return null;
  return { one, two };
}

function brandMark(color: string) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div
        style={{
          display: "flex",
          width: 6,
          height: 6,
          marginRight: 12,
          background: color,
          transform: "rotate(45deg)",
        }}
      />
      <div
        style={{
          display: "flex",
          fontSize: 12,
          letterSpacing: "0.42em",
          color,
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        CELEVENTIC
      </div>
    </div>
  );
}

export function SocialPlaceCardMarkup({
  variant,
  theme,
  title,
  dateLabel,
  dateLines,
  phrase,
  heroSrc,
  unavailable = false,
  unavailablePhrase,
  kicker,
  guestGreeting,
  heroFit,
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
  const dates =
    !unavailable && (dateLines?.filter(Boolean).length ? dateLines.filter(Boolean) : dateLabel ? [dateLabel] : []);
  const size = unavailable
    ? 40
    : lockup
      ? showPhoto
        ? 44
        : 64
      : titleSize(displayTitle, Boolean(greeting));

  if (showPhoto) {
    const ink = palette.ivory;
    const quiet = palette.muted;
    const mark = palette.gold;
    const coverTop = heroFit === "cover-top";
    const photoW = coverTop ? 700 : PHOTO_W;
    return (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background: "#102038",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: photoW,
            height: 630,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            background: "#0B1728",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroSrc ?? ""}
            alt=""
            width={photoW}
            height={630}
            style={{
              width: photoW,
              height: 630,
              objectFit: coverTop ? "cover" : "contain",
              objectPosition: coverTop ? "center top" : "center",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 1200 - photoW,
            height: 630,
            padding: "54px 58px 48px",
            background: "linear-gradient(165deg, #102038 0%, #1B365D 52%, #16304F 100%)",
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
                  fontSize: 24,
                  fontStyle: "italic",
                  lineHeight: 1.2,
                  marginBottom: 10,
                }}
              >
                {greeting}
              </div>
            ) : null}

            {displayPhrase ? (
              <div
                style={{
                  display: "flex",
                  color: ink,
                  fontSize: greeting ? 26 : 22,
                  lineHeight: 1.25,
                  marginBottom: 18,
                  fontWeight: 600,
                }}
              >
                {displayPhrase}
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
                  maxWidth: 640,
                }}
              >
                {displayTitle}
              </div>
            )}

            {dates.length ? (
              <div style={{ display: "flex", flexDirection: "column", marginTop: 20 }}>
                {dates.map((line) => (
                  <div
                    key={line}
                    style={{
                      display: "flex",
                      color: mark,
                      fontSize: dates.length > 1 ? 16 : 15,
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      fontFamily: "Helvetica, Arial, sans-serif",
                      marginTop: dates.length > 1 ? 6 : 0,
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {brandMark(mark)}
        </div>
      </div>
    );
  }

  const showPhrase = Boolean(displayPhrase);
  const ink = INK;
  const quiet = "rgba(28, 25, 21, 0.62)";
  const mark = accent;

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
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 88px",
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
                maxWidth: "900px",
              }}
            >
              {displayTitle}
            </div>
          )}

          {dates.length && !unavailable ? (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 18 }}>
              {dates.map((line) => (
                <div
                  key={line}
                  style={{
                    display: "flex",
                    color: mark,
                    fontSize: 15,
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    fontFamily: "Helvetica, Arial, sans-serif",
                    marginTop: dates.length > 1 ? 6 : 0,
                  }}
                >
                  {line}
                </div>
              ))}
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
                maxWidth: "760px",
              }}
            >
              {displayPhrase}
            </div>
          ) : null}
        </div>

        {brandMark(mark)}
      </div>
    </div>
  );
}
