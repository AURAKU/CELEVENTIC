import { NextResponse } from "next/server";
import { qrBrandingService } from "@/services/qr/qr-branding.service";
import { buildVerifyUrl, parseQrToken } from "@/lib/qr/parse-qr-payload";
import { generateBrandedQrPng } from "@/lib/qr/branded-qr-generator";
import { QR_EXPORT_SIZES, QR_DEFAULT_SIZE, type QrDisplayMode, type QrExportSize } from "@/lib/qr/qr-constants";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyEventAccess } from "@/lib/event-access";

function parseSize(raw: string | null): QrExportSize {
  const n = parseInt(raw ?? String(QR_DEFAULT_SIZE), 10);
  return (QR_EXPORT_SIZES.includes(n as QrExportSize) ? n : QR_DEFAULT_SIZE) as QrExportSize;
}

/** Public branded QR PNG/SVG — token encodes secure verify URL only (no PII) */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const rawData = searchParams.get("data");
  const eventId = searchParams.get("eventId");
  const download = searchParams.get("download") === "1";
  const format = searchParams.get("format") ?? "png";
  const size = parseSize(searchParams.get("size"));
  const mode = (searchParams.get("mode") === "pass" ? "pass" : "brand") as QrDisplayMode;

  try {
    let filename = "celeventic-qr.png";

    if (token) {
      const parsed = parseQrToken(token) ?? token;
      const result = await qrBrandingService.generateForToken(parsed, size, format === "svg" ? "svg" : "png", mode);

      if (format === "svg") {
        filename = `celeventic-pass-${parsed.slice(0, 8)}.svg`;
        return new NextResponse(result.svg, {
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public, max-age=3600",
            ...(download ? { "Content-Disposition": `attachment; filename="${filename}"` } : {}),
          },
        });
      }

      filename = `celeventic-pass-${parsed.slice(0, 8)}-${size}.png`;
      return new NextResponse(new Uint8Array(result.png), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600",
          ...(download ? { "Content-Disposition": `attachment; filename="${filename}"` } : {}),
        },
      });
    }

    if (rawData) {
      const url = rawData.startsWith("http") ? rawData : buildVerifyUrl(rawData);
      const center = eventId
        ? await qrBrandingService.resolveCenterImageUrl(eventId)
        : await qrBrandingService.getAdminDefaultLogoUrl();
      const logoSize = eventId
        ? await qrBrandingService.resolveLogoSize(eventId)
        : await qrBrandingService.getAdminDefaultLogoSize();

      if (format === "svg") {
        const { generateBrandedQrSvg } = await import("@/lib/qr/branded-qr-generator");
        const svg = await generateBrandedQrSvg(url, center, size, mode, logoSize);
        return new NextResponse(svg, {
          headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=300" },
        });
      }

      const png = await generateBrandedQrPng(url, center, size, mode, logoSize);
      return new NextResponse(new Uint8Array(png), {
        headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" },
      });
    }

    return NextResponse.json({ error: "token or data required" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "QR generation failed" }, { status: 500 });
  }
}

/** Invalidate cache after event logo change (organizer/admin) */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  await verifyEventAccess(eventId, session.user.id, session.user.role);

  const count = await prisma.qrCode.count({ where: { eventId } });
  return NextResponse.json({
    success: true,
    message: `${count} QR code(s) will use updated branding on next render.`,
    count,
  });
}
