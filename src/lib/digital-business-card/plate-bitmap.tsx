import { CELECARD_CARD_ASPECT } from "@/lib/digital-business-card/share";
import { SMARTCARD_BRAND_TAGLINE, SMARTCARD_PRODUCT_SHORT_NAME } from "@/lib/digital-business-card/product";
import type { DigitalCardTheme } from "@/lib/digital-business-card/themes";
import {
  celecardPortraitFrameRadius,
  resolveCeleCardPortraitFrame,
  type CeleCardPortraitFrame,
} from "@/lib/digital-business-card/portrait-frame";
import { CeleCardQrCenterOverlay } from "@/lib/digital-business-card/qr-center-overlay";
import { celecardCompanyDisplayLines } from "@/lib/digital-business-card/type-voice";

function isEmbeddedImage(src?: string | null): src is string {
  return Boolean(src && src.startsWith("data:image/"));
}

export type CeleCardPlateBitmapProps = {
  width: number;
  height: number;
  /** Crop the ID-1 plate to fill the tile. */
  cover?: boolean;
  /** Letterbox the full ID-1 plate. iMessage must see name, title, company, and QR, not a headshot. */
  contain?: boolean;
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

function coverPlateSize(tileW: number, tileH: number) {
  if (tileH * CELECARD_CARD_ASPECT >= tileW) {
    return { width: Math.round(tileH * CELECARD_CARD_ASPECT), height: tileH };
  }
  return { width: tileW, height: Math.round(tileW / CELECARD_CARD_ASPECT) };
}

function containPlateSize(tileW: number, tileH: number) {
  if (tileW / tileH > CELECARD_CARD_ASPECT) {
    return { width: Math.round(tileH * CELECARD_CARD_ASPECT), height: tileH };
  }
  return { width: tileW, height: Math.round(tileW / CELECARD_CARD_ASPECT) };
}

/** Satori-safe live plate. OG tiles letterbox the full ID-1 face. Export keeps the uncropped card. */
export function CeleCardPlateBitmap({
  width,
  height,
  cover = false,
  contain = false,
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
}: CeleCardPlateBitmapProps) {
  const plate = cover ? coverPlateSize(width, height) : contain ? containPlateSize(width, height) : { width, height };
  const s = plate.height / 558;
  const photo = Math.max(120, Math.round(188 * s));
  const qr = Math.max(128, Math.round(196 * s));
  const mark = Math.max(48, Math.round(68 * s));
  const nameSize = displayName.length > 18 ? Math.round(38 * s) : displayName.length > 12 ? Math.round(46 * s) : Math.round(54 * s);
  const initials = initialsOf(displayName) || "CC";
  const photoRadius = celecardPortraitFrameRadius(resolveCeleCardPortraitFrame(theme, portraitFrame), photo);
  const role = title?.trim() || "";
  const houseLines = company?.trim() ? celecardCompanyDisplayLines(company.trim(), { uppercase: true }) : [];
  const plateTop = Math.round((height - plate.height) / 2);
  const plateLeft = Math.round((width - plate.width) / 2);

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: theme.cardBackground,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: plate.width,
          height: plate.height,
          display: "flex",
          position: "absolute",
          top: plateTop,
          left: plateLeft,
        }}
      >
        <div
          style={{
            width: plate.width,
            height: plate.height,
            display: "flex",
            flexDirection: "column",
            borderRadius: cover ? 0 : 28,
            border: cover ? "none" : `1px solid ${theme.border}`,
            background: theme.cardBackground,
            color: theme.text,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {isEmbeddedImage(paperSrc) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={paperSrc}
              alt=""
              width={plate.width}
              height={plate.height}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: plate.width,
                height: plate.height,
                objectFit: "cover",
                opacity: 0.42,
              }}
            />
          ) : null}
          <div
            style={{
              position: "absolute",
              top: Math.round(14 * s),
              left: Math.round(14 * s),
              width: plate.width - Math.round(28 * s),
              height: plate.height - Math.round(28 * s),
              borderRadius: Math.round(20 * s),
              border: `1px solid ${theme.border}`,
              opacity: 0.55,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: Math.round(22 * s),
              left: Math.round(22 * s),
              width: plate.width - Math.round(44 * s),
              height: plate.height - Math.round(44 * s),
              borderRadius: Math.round(16 * s),
              border: `1px solid ${theme.accent}`,
              opacity: 0.4,
            }}
          />
          <div style={{ height: Math.round(44 * s), flexShrink: 0, display: "flex" }} />
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              padding: `${Math.round(4 * s)}px ${Math.round(32 * s)}px ${Math.round(8 * s)}px`,
            }}
          >
            <div
              style={{
                width: photo,
                height: photo,
                position: "relative",
                flexShrink: 0,
                display: "flex",
              }}
            >
              <div
                style={{
                  width: photo,
                  height: photo,
                  borderRadius: photoRadius,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#ffffff",
                  border: `${Math.max(2, Math.round(3 * s))}px solid ${theme.accent}`,
                }}
              >
                {isEmbeddedImage(photoSrc) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoSrc} alt="" width={photo} height={photo} style={{ objectFit: "cover" }} />
                ) : isEmbeddedImage(markSrc) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={markSrc}
                    alt=""
                    width={Math.round(photo * 0.88)}
                    height={Math.round(photo * 0.88)}
                    style={{ objectFit: "contain" }}
                  />
                ) : (
                  <div style={{ fontSize: Math.round(52 * s), fontWeight: 700, color: theme.accent }}>{initials}</div>
                )}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                marginLeft: Math.round(26 * s),
                marginRight: Math.round(20 * s),
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
                    marginTop: Math.round(10 * s),
                    marginLeft: Math.round(-8 * s),
                    fontSize: Math.round(22 * s),
                    fontStyle: "italic",
                    color: theme.muted,
                    whiteSpace: "nowrap",
                  }}
                >
                  {role}
                </div>
              ) : null}
              {houseLines.length ? (
                <div
                  style={{
                    marginTop: Math.round(8 * s),
                    display: "flex",
                    flexDirection: "column",
                    marginLeft: Math.round(-8 * s),
                  }}
                >
                  {houseLines.map((line) => (
                    <div
                      key={line}
                      style={{
                        fontSize: Math.round(houseLines.length > 1 ? 17 * s : 18 * s),
                        letterSpacing: houseLines.length > 1 ? 1.6 : 3,
                        lineHeight: 1.15,
                        textTransform: "uppercase",
                        color: theme.accent,
                        fontWeight: 600,
                      }}
                    >
                      {line}
                    </div>
                  ))}
                  {isEmbeddedImage(companyLogoSrc) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={companyLogoSrc}
                      alt=""
                      width={Math.round(44 * s)}
                      height={Math.round(44 * s)}
                      style={{
                        marginTop: Math.round(7 * s),
                        marginLeft: Math.round(-26 * s),
                        objectFit: "contain",
                        borderRadius: 999,
                        background: "#ffffff",
                        border: `${Math.max(2, Math.round(2 * s))}px solid ${theme.accent}`,
                      }}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
            {isEmbeddedImage(qrSrc) ? (
              <div
                style={{
                  width: qr,
                  height: qr,
                  background: "#ffffff",
                  borderRadius: Math.round(22 * s),
                  padding: Math.round(10 * s),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: qr - Math.round(20 * s),
                    height: qr - Math.round(20 * s),
                    display: "flex",
                    position: "relative",
                  }}
                >
                  {isEmbeddedImage(qrSrc) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrSrc} alt="" width={qr - Math.round(20 * s)} height={qr - Math.round(20 * s)} />
                  ) : null}
                  <CeleCardQrCenterOverlay
                    photoSrc={isEmbeddedImage(photoSrc) ? photoSrc : null}
                    markSrc={isEmbeddedImage(markSrc) ? markSrc : null}
                    qrSize={qr - Math.round(20 * s)}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <div
            style={{
              height: Math.round(64 * s),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", fontSize: Math.round(18 * s), fontWeight: 700, letterSpacing: -0.4 }}>
              <div style={{ color: theme.text }}>{SMARTCARD_PRODUCT_SHORT_NAME.slice(0, 4)}</div>
              <div style={{ color: theme.accent }}>{SMARTCARD_PRODUCT_SHORT_NAME.slice(4)}</div>
            </div>
            <div style={{ marginTop: Math.round(4 * s), fontSize: Math.round(12 * s), color: theme.muted }}>
              {SMARTCARD_BRAND_TAGLINE}
            </div>
          </div>
        </div>
        {isEmbeddedImage(markSrc) ? (
          <div
            style={{
              position: "absolute",
              top: Math.round(-10 * s),
              left: 0,
              width: plate.width,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: mark,
                height: mark,
                borderRadius: 999,
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={markSrc} alt="" width={Math.round(mark * 0.85)} height={Math.round(mark * 0.85)} style={{ objectFit: "contain" }} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
