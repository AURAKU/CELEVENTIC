import { CELECARD_OG_HEIGHT, CELECARD_OG_WIDTH } from "@/lib/digital-business-card/share";
import { SMARTCARD_PRODUCT_SHORT_NAME } from "@/lib/digital-business-card/product";
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
};

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Server-safe 1200×630 preview. Theme tokens, public identity, optional scannable QR. */
export function CeleCardOgMarkup({
  displayName,
  title,
  company,
  theme,
  photoSrc,
  qrSrc,
  qrLabel,
  portraitFrame,
}: CeleCardOgMarkupProps) {
  const initials = initialsOf(displayName) || "CC";
  const photoRadius = celecardPortraitFrameRadius(resolveCeleCardPortraitFrame(theme, portraitFrame), 168);
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
          position: "absolute",
          inset: 0,
          background: `linear-gradient(160deg, ${theme.accentSoft} 0%, transparent 46%, rgba(0,0,0,0.18) 100%)`,
        }}
      />
      <div
        style={{
          width: 1080,
          height: 520,
          display: "flex",
          alignItems: "center",
          borderRadius: 28,
          border: `1px solid ${theme.border}`,
          background: theme.cardBackground,
          color: theme.text,
          boxShadow: "0 28px 64px rgba(8,12,24,0.32)",
          padding: "36px 36px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 18,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            fontSize: 13,
            letterSpacing: 0.4,
            color: theme.accent,
            fontWeight: 700,
          }}
        >
          {SMARTCARD_PRODUCT_SHORT_NAME}
        </div>
        <div
          style={{
            width: 168,
            height: 168,
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
            <img src={photoSrc} alt="" width={168} height={168} style={{ objectFit: "cover" }} />
          ) : (
            <div style={{ fontSize: 48, fontWeight: 700, color: theme.accent }}>{initials}</div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 28,
            minWidth: 0,
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: displayName.length > 22 ? 36 : 46,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -1,
            }}
          >
            {displayName}
          </div>
          {title ? (
            <div style={{ marginTop: 8, fontSize: 22, fontStyle: "italic", color: theme.muted }}>{title}</div>
          ) : null}
          {company ? (
            <div
              style={{
                marginTop: 8,
                fontSize: 18,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: theme.accent,
                fontWeight: 600,
              }}
            >
              {company}
            </div>
          ) : null}
          {qrLabel ? (
            <div style={{ marginTop: 16, fontSize: 16, color: theme.muted, letterSpacing: 0.2 }}>{qrLabel}</div>
          ) : null}
        </div>
        {qrSrc ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginLeft: 20,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 220,
                height: 220,
                background: "#ffffff",
                borderRadius: 22,
                padding: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <div style={{ width: 200, height: 200, display: "flex", position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrSrc} alt="" width={200} height={200} />
                <CeleCardQrCenterOverlay photoSrc={photoSrc} qrSize={200} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
