import { CELECARD_CARD_ASPECT, CELECARD_OG_HEIGHT, CELECARD_OG_WIDTH } from "@/lib/digital-business-card/share";
import { SMARTCARD_BRAND_TAGLINE, SMARTCARD_PRODUCT_SHORT_NAME } from "@/lib/digital-business-card/product";
import type { DigitalCardTheme } from "@/lib/digital-business-card/themes";
import {
  celecardPortraitFrameRadius,
  resolveCeleCardPortraitFrame,
  type CeleCardPortraitFrame,
} from "@/lib/digital-business-card/portrait-frame";
import { CeleCardQrCenterOverlay } from "@/lib/digital-business-card/qr-center-overlay";

export type CeleCardOgMarkupProps = {
  displayName: string;
  title?: string | null;
  company?: string | null;
  theme: DigitalCardTheme;
  photoSrc?: string | null;
  qrSrc?: string | null;
  qrLabel?: string | null;
  portraitFrame?: CeleCardPortraitFrame | null;
  markSrc?: string | null;
};

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const CARD_HEIGHT = 558;
const CARD_WIDTH = Math.round(CARD_HEIGHT * CELECARD_CARD_ASPECT);
const PHOTO = 188;
const QR = 204;

/** 1200×630 share tile: the ID-1 card on the house stage. Nothing else. */
export function CeleCardOgMarkup({
  displayName,
  title,
  company,
  theme,
  photoSrc,
  qrSrc,
  portraitFrame,
  markSrc,
}: CeleCardOgMarkupProps) {
  const initials = initialsOf(displayName) || "CC";
  const photoRadius = celecardPortraitFrameRadius(resolveCeleCardPortraitFrame(theme, portraitFrame), PHOTO);
  const nameSize = displayName.length > 18 ? 40 : displayName.length > 12 ? 48 : 56;
  return (
    <div
      style={{
        width: CELECARD_OG_WIDTH,
        height: CELECARD_OG_HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: theme.stageBackground,
        position: "relative",
      }}
    >
      <div
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          display: "flex",
          flexDirection: "column",
          borderRadius: 28,
          border: `1px solid ${theme.border}`,
          background: theme.cardBackground,
          color: theme.text,
          boxShadow: "0 28px 80px rgba(8,12,24,0.38)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 14,
            borderRadius: 20,
            border: `1px solid ${theme.border}`,
            opacity: 0.7,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 22,
            borderRadius: 16,
            border: `1px solid ${theme.accent}`,
            opacity: 0.45,
          }}
        />
        <div
          style={{
            height: 72,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {markSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={markSrc} alt="" width={58} height={58} style={{ objectFit: "contain" }} />
          ) : (
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: -0.4,
                color: theme.accent,
              }}
            >
              {SMARTCARD_PRODUCT_SHORT_NAME}
            </div>
          )}
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            padding: "8px 36px 12px",
          }}
        >
          <div
            style={{
              width: PHOTO,
              height: PHOTO,
              borderRadius: photoRadius,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: theme.accentSoft,
              border: `3px solid ${theme.accent}`,
              flexShrink: 0,
            }}
          >
            {photoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoSrc} alt="" width={PHOTO} height={PHOTO} style={{ objectFit: "cover" }} />
            ) : (
              <div style={{ fontSize: 52, fontWeight: 700, color: theme.accent }}>{initials}</div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              marginLeft: 28,
              marginRight: 24,
              minWidth: 0,
              flex: 1,
            }}
          >
            <div
              style={{
                fontSize: nameSize,
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: -1.2,
              }}
            >
              {displayName}
            </div>
            {title ? (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 22,
                  fontStyle: "italic",
                  color: theme.muted,
                }}
              >
                {title}
              </div>
            ) : null}
            {company ? (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 18,
                  letterSpacing: 3.2,
                  textTransform: "uppercase",
                  color: theme.accent,
                  fontWeight: 600,
                }}
              >
                {company}
              </div>
            ) : null}
          </div>
          {qrSrc ? (
            <div
              style={{
                width: QR,
                height: QR,
                background: "#ffffff",
                borderRadius: 22,
                padding: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                position: "relative",
              }}
            >
              <div style={{ width: QR - 20, height: QR - 20, display: "flex", position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrSrc} alt="" width={QR - 20} height={QR - 20} />
                <CeleCardQrCenterOverlay photoSrc={photoSrc} markSrc={markSrc} qrSize={QR - 20} />
              </div>
            </div>
          ) : null}
        </div>
        <div
          style={{
            height: 58,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.4, color: theme.accent }}>
            {SMARTCARD_PRODUCT_SHORT_NAME}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 1.4,
              color: theme.accent,
              opacity: 0.88,
            }}
          >
            {SMARTCARD_BRAND_TAGLINE}
          </div>
        </div>
      </div>
    </div>
  );
}
