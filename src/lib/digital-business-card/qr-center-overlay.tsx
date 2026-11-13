import { CELECARD_QR_CENTER_WELL } from "@/lib/digital-business-card/qr-center";

function isEmbeddedImage(src?: string | null): src is string {
  return Boolean(src && src.startsWith("data:image/"));
}

/** Satori-safe QR inset. Portrait when uploaded, otherwise the official CeleYou mark data URL. */
export function CeleCardQrCenterOverlay({
  photoSrc,
  markSrc,
  qrSize,
}: {
  photoSrc?: string | null;
  markSrc?: string | null;
  qrSize: number;
}) {
  const src = isEmbeddedImage(photoSrc) ? photoSrc : isEmbeddedImage(markSrc) ? markSrc : null;
  if (!src) return null;
  const official = !isEmbeddedImage(photoSrc);
  const well = Math.max(22, Math.round(qrSize * CELECARD_QR_CENTER_WELL));
  const inner = official
    ? Math.max(14, Math.round(well * 0.8))
    : Math.max(16, Math.round(well * 0.92));
  const radius = official ? Math.round(well * 0.18) : well;
  return (
    <div
      style={{
        position: "absolute",
        left: Math.round((qrSize - well) / 2),
        top: Math.round((qrSize - well) / 2),
        width: well,
        height: well,
        borderRadius: radius,
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={inner}
        height={inner}
        style={{
          width: inner,
          height: inner,
          borderRadius: official ? Math.round(inner * 0.08) : inner,
          objectFit: official ? "contain" : "cover",
        }}
      />
    </div>
  );
}
