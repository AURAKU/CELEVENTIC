import { CELECARD_EXPORT_HEIGHT, CELECARD_EXPORT_WIDTH } from "@/lib/digital-business-card/share";
import { SMARTCARD_PRODUCT_SHORT_NAME } from "@/lib/digital-business-card/product";
import type { DigitalCardTheme } from "@/lib/digital-business-card/themes";
import {
  celecardPortraitFrameRadius,
  resolveCeleCardPortraitFrame,
  type CeleCardPortraitFrame,
} from "@/lib/digital-business-card/portrait-frame";
import { CELEYOU_MARK_SRC } from "@/components/digital-business-card/celeyou-brand-mark";
import { CeleCardQrCenterOverlay } from "@/lib/digital-business-card/qr-center-overlay";

export type CeleCardExportMarkupProps = {
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

/** High-resolution ID-1 export. Selected theme, public identity, embedded guide QR. */
export function CeleCardExportMarkup({
  displayName,
  title,
  company,
  theme,
  photoSrc,
  qrSrc,
  qrLabel,
  portraitFrame,
}: CeleCardExportMarkupProps) {
  const initials = initialsOf(displayName) || "CC";
  const photoRadius = celecardPortraitFrameRadius(resolveCeleCardPortraitFrame(theme, portraitFrame), 280);
  return (
    <div
      style={{
        width: CELECARD_EXPORT_WIDTH,
        height: CELECARD_EXPORT_HEIGHT,
        display: "flex",
        alignItems: "center",
        background: theme.cardBackground,
        color: theme.text,
        position: "relative",
        border: `2px solid ${theme.border}`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 18,
          border: `1px solid ${theme.accent}`,
          borderRadius: 18,
          opacity: 0.55,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 28,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          fontSize: 18,
          letterSpacing: 0.4,
          color: theme.accent,
          fontWeight: 700,
        }}
      >
        {SMARTCARD_PRODUCT_SHORT_NAME}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "88px 72px 72px",
          width: "100%",
        }}
      >
        <div
          style={{
            width: 280,
            height: 280,
            borderRadius: photoRadius,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: theme.accentSoft,
            border: `4px solid ${theme.accent}`,
            flexShrink: 0,
          }}
        >
          {photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoSrc} alt="" width={280} height={280} style={{ objectFit: "cover" }} />
          ) : (
            <div style={{ fontSize: 72, fontWeight: 700, color: theme.accent }}>{initials}</div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 48,
            minWidth: 0,
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: displayName.length > 22 ? 56 : 72,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -1.5,
            }}
          >
            {displayName}
          </div>
          {title ? (
            <div style={{ marginTop: 14, fontSize: 32, fontStyle: "italic", color: theme.muted }}>{title}</div>
          ) : null}
          {company ? (
            <div
              style={{
                marginTop: 12,
                fontSize: 24,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: theme.accent,
                fontWeight: 600,
              }}
            >
              {company}
            </div>
          ) : null}
          {qrLabel ? (
            <div style={{ marginTop: 28, fontSize: 22, color: theme.muted }}>{qrLabel}</div>
          ) : null}
        </div>
        {qrSrc ? (
          <div
            style={{
              width: 360,
              height: 360,
              background: "#ffffff",
              borderRadius: 28,
              padding: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginLeft: 24,
              position: "relative",
            }}
          >
            <div style={{ width: 328, height: 328, display: "flex", position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc} alt="" width={328} height={328} />
              <CeleCardQrCenterOverlay photoSrc={photoSrc} markSrc={CELEYOU_MARK_SRC} qrSize={328} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
