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
  paperSrc?: string | null;
  companyLogoSrc?: string | null;
};

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const CARD_HEIGHT = 558;
const CARD_WIDTH = Math.round(CARD_HEIGHT * CELECARD_CARD_ASPECT);
const PHOTO = 188;
const QR = 196;
const MARK = 68;

/** 1200×630 share tile: the live ID-1 plate only, on the house stage. */
export function CeleCardOgMarkup({
  displayName,
  title,
  company,
  theme,
  photoSrc,
  qrSrc,
  portraitFrame,
  markSrc,
  paperSrc,
  companyLogoSrc,
}: CeleCardOgMarkupProps) {
  const initials = initialsOf(displayName) || "CC";
  const photoRadius = celecardPortraitFrameRadius(resolveCeleCardPortraitFrame(theme, portraitFrame), PHOTO);
  const nameSize = displayName.length > 18 ? 38 : displayName.length > 12 ? 46 : 54;
  const role = title?.trim() || "";
  const house = company?.trim() || "";
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
          {paperSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={paperSrc}
              alt=""
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
              style={{
                position: "absolute",
                inset: 0,
                width: CARD_WIDTH,
                height: CARD_HEIGHT,
                objectFit: "cover",
                opacity: 0.42,
              }}
            />
          ) : null}
          <div
            style={{
              position: "absolute",
              inset: 14,
              borderRadius: 20,
              border: `1px solid ${theme.border}`,
              opacity: 0.55,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 22,
              borderRadius: 16,
              border: `1px solid ${theme.accent}`,
              opacity: 0.4,
            }}
          />
          <div style={{ height: 44, flexShrink: 0, display: "flex" }} />
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              padding: "4px 32px 8px",
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
                background: "#ffffff",
                border: `3px solid ${theme.accent}`,
                flexShrink: 0,
              }}
            >
              {photoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoSrc} alt="" width={PHOTO} height={PHOTO} style={{ objectFit: "cover" }} />
              ) : markSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={markSrc}
                  alt=""
                  width={Math.round(PHOTO * 0.88)}
                  height={Math.round(PHOTO * 0.88)}
                  style={{ objectFit: "contain" }}
                />
              ) : (
                <div style={{ fontSize: 52, fontWeight: 700, color: theme.accent }}>{initials}</div>
              )}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                marginLeft: 26,
                marginRight: 20,
                minWidth: 0,
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: nameSize,
                  fontWeight: 700,
                  lineHeight: 1.05,
                  letterSpacing: -1.1,
                }}
              >
                {displayName}
              </div>
              {role ? (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 22,
                    fontStyle: "italic",
                    color: theme.muted,
                  }}
                >
                  {role}
                </div>
              ) : null}
              {house ? (
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {companyLogoSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={companyLogoSrc}
                      alt=""
                      width={28}
                      height={28}
                      style={{
                        objectFit: "cover",
                        borderRadius: 8,
                        marginRight: 10,
                      }}
                    />
                  ) : null}
                  <div
                    style={{
                      fontSize: 18,
                      letterSpacing: 3,
                      textTransform: "uppercase",
                      color: theme.accent,
                      fontWeight: 600,
                    }}
                  >
                    {house}
                  </div>
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
              height: 64,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", fontSize: 18, fontWeight: 700, letterSpacing: -0.4 }}>
              <div style={{ color: theme.text }}>{SMARTCARD_PRODUCT_SHORT_NAME.slice(0, 4)}</div>
              <div style={{ color: theme.accent }}>{SMARTCARD_PRODUCT_SHORT_NAME.slice(4)}</div>
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: theme.muted }}>{SMARTCARD_BRAND_TAGLINE}</div>
          </div>
        </div>
        {markSrc ? (
          <div
            style={{
              position: "absolute",
              top: -10,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: MARK,
                height: MARK,
                borderRadius: 999,
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 22px rgba(45,212,191,0.45), 0 6px 16px rgba(7,63,60,0.18)",
                overflow: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={markSrc} alt="" width={58} height={58} style={{ objectFit: "contain" }} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
