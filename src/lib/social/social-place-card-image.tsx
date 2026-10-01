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

function titleSize(title: string, personalized: boolean): number {
  if (title.length > 42) return personalized ? 40 : 44;
  if (title.length > 28) return personalized ? 48 : 54;
  if (title.length > 18) return personalized ? 56 : 64;
  return personalized ? 64 : 76;
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

function HudCorner({
  x,
  y,
  color,
}: {
  x: "left" | "right";
  y: "top" | "bottom";
  color: string;
}) {
  const on = `2px solid ${color}`;
  const off = "0px solid transparent";
  return (
    <div
      style={{
        position: "absolute",
        left: x === "left" ? 32 : 1142,
        top: y === "top" ? 32 : 572,
        width: 26,
        height: 26,
        display: "flex",
        borderTop: y === "top" ? on : off,
        borderBottom: y === "bottom" ? on : off,
        borderLeft: x === "left" ? on : off,
        borderRight: x === "right" ? on : off,
      }}
    />
  );
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
  const size = unavailable ? 42 : lockup ? 78 : titleSize(displayTitle, Boolean(greeting));
  const showPhrase = Boolean(displayPhrase) && (unavailable || !heroSrc || Boolean(greeting));
  const gold = palette.gold;
  const ivory = palette.ivory;

  return (
    <div
      style={{
        width: "1200px",
        height: "630px",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: palette.heroWash,
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      {heroSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroSrc}
          alt=""
          width={1200}
          height={630}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "1200px",
            height: "630px",
            objectFit: "cover",
            objectPosition: "center 18%",
          }}
        />
      ) : null}

      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "1200px",
          height: "630px",
          display: "flex",
          background: heroSrc
            ? "linear-gradient(180deg, rgba(4,6,8,0.22) 0%, rgba(4,6,8,0.04) 34%, rgba(4,6,8,0.42) 68%, rgba(4,6,8,0.92) 100%)"
            : palette.panel,
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
            "linear-gradient(90deg, rgba(4,6,8,0.38) 0%, rgba(4,6,8,0) 28%, rgba(4,6,8,0) 62%, rgba(4,6,8,0.55) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          right: -210,
          top: 40,
          width: 540,
          height: 540,
          display: "flex",
          borderRadius: 540,
          border: `1px solid ${gold}55`,
          background: "rgba(0,0,0,0)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: -150,
          top: 100,
          width: 420,
          height: 420,
          display: "flex",
          borderRadius: 420,
          border: `1px solid ${gold}33`,
          background: "rgba(0,0,0,0)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 5,
          height: "630px",
          display: "flex",
          background: gold,
        }}
      />
      {[0, 1, 2, 3, 4, 5, 6].map((index) => (
        <div
          key={`tick-${index}`}
          style={{
            position: "absolute",
            left: 12,
            top: 48 + index * 78,
            width: 10,
            height: 4,
            display: "flex",
            background: gold,
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          left: 24,
          top: 24,
          width: 1152,
          height: 582,
          display: "flex",
          border: `1px solid ${gold}40`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 32,
          top: 32,
          width: 1136,
          height: 566,
          display: "flex",
          border: `1px solid ${gold}22`,
        }}
      />

      <HudCorner x="left" y="top" color={gold} />
      <HudCorner x="right" y="top" color={gold} />
      <HudCorner x="left" y="bottom" color={gold} />
      <HudCorner x="right" y="bottom" color={gold} />

      <div
        style={{
          position: "absolute",
          left: 56,
          top: 50,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 11,
            letterSpacing: "0.48em",
            color: gold,
            fontFamily: "Helvetica, Arial, sans-serif",
          }}
        >
          {displayKicker}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 10,
            width: 54,
            height: 1,
            background: gold,
          }}
        />
      </div>

      {dateLabel && !unavailable ? (
        <div
          style={{
            position: "absolute",
            right: 56,
            top: 46,
            display: "flex",
            padding: "11px 18px",
            border: `1px solid ${gold}99`,
            background: "rgba(8,10,12,0.28)",
            color: gold,
            fontSize: 13,
            letterSpacing: "0.34em",
            textTransform: "uppercase",
            fontFamily: "Helvetica, Arial, sans-serif",
          }}
        >
          {dateLabel}
        </div>
      ) : null}

      <div
        style={{
          position: "absolute",
          left: 56,
          bottom: 44,
          right: 56,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {greeting ? (
          <div
            style={{
              display: "flex",
              color: "rgba(246, 240, 230, 0.8)",
              fontSize: 22,
              fontStyle: "italic",
              lineHeight: 1.2,
              marginBottom: 8,
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
                color: ivory,
                fontSize: size,
                lineHeight: 0.92,
                letterSpacing: "-0.04em",
                textShadow: "0 22px 48px rgba(0,0,0,0.5)",
              }}
            >
              {lockup.one}
            </div>
            <div style={{ display: "flex", alignItems: "center", marginTop: 2 }}>
              <div
                style={{
                  display: "flex",
                  color: gold,
                  fontSize: Math.round(size * 0.72),
                  lineHeight: 0.9,
                  marginRight: 16,
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}
              >
                &
              </div>
              <div
                style={{
                  display: "flex",
                  color: ivory,
                  fontSize: size,
                  lineHeight: 0.92,
                  letterSpacing: "-0.04em",
                  textShadow: "0 22px 48px rgba(0,0,0,0.5)",
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
              color: ivory,
              fontSize: size,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              maxWidth: "980px",
              textShadow: "0 18px 40px rgba(0,0,0,0.45)",
            }}
          >
            {displayTitle}
          </div>
        )}

        <div
          style={{
            display: "flex",
            marginTop: 16,
            width: 72,
            height: 2,
            background: gold,
          }}
        />
        {showPhrase ? (
          <div
            style={{
              display: "flex",
              marginTop: 14,
              fontSize: 21,
              lineHeight: 1.35,
              color: "rgba(246, 240, 230, 0.78)",
              maxWidth: "640px",
            }}
          >
            {displayPhrase}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            marginTop: 18,
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 7,
              height: 7,
              marginRight: 12,
              background: gold,
              transform: "rotate(45deg)",
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 12,
              letterSpacing: "0.46em",
              color: gold,
              fontFamily: "Helvetica, Arial, sans-serif",
            }}
          >
            CELEVENTIC
          </div>
        </div>
      </div>

      {!unavailable ? (
        <div
          style={{
            position: "absolute",
            right: 56,
            bottom: 52,
            display: "flex",
            fontSize: 11,
            letterSpacing: "0.42em",
            color: `${gold}cc`,
            fontFamily: "Helvetica, Arial, sans-serif",
          }}
        >
          OPEN TO ENTER
        </div>
      ) : null}
    </div>
  );
}
