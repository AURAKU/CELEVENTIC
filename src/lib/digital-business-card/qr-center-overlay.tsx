import { CELECARD_QR_CENTER_WELL } from "@/lib/digital-business-card/qr-center";

/** Satori-safe QR inset. Photo in the middle, same geometry as the live card badge. */
export function CeleCardQrCenterOverlay({
  photoSrc,
  qrSize,
}: {
  photoSrc?: string | null;
  qrSize: number;
}) {
  if (!photoSrc) return null;
  const well = Math.max(22, Math.round(qrSize * CELECARD_QR_CENTER_WELL));
  const inner = Math.max(16, Math.round(well * 0.92));
  return (
    <div
      style={{
        position: "absolute",
        left: Math.round((qrSize - well) / 2),
        top: Math.round((qrSize - well) / 2),
        width: well,
        height: well,
        borderRadius: well,
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoSrc}
        alt=""
        width={inner}
        height={inner}
        style={{ width: inner, height: inner, borderRadius: inner, objectFit: "cover" }}
      />
    </div>
  );
}
