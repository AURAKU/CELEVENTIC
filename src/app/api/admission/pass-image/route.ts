import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerAppUrl } from "@/lib/app-url";
import { generateBrandedQrPng, generateBrandedQrSvg } from "@/lib/qr/branded-qr-generator";
import { qrBrandingService } from "@/services/qr/qr-branding.service";
import {
  QR_DEFAULT_SIZE,
  QR_EXPORT_SIZES,
  type QrDisplayMode,
  type QrExportSize,
} from "@/lib/qr/qr-constants";
import {
  buildPassUrl,
  hashPassToken,
  verifyPassTokenSignature,
} from "@/lib/admission/pass-token";

export const dynamic = "force-dynamic";

function parseSize(raw: string | null): QrExportSize {
  const n = parseInt(raw ?? String(QR_DEFAULT_SIZE), 10);
  return (QR_EXPORT_SIZES.includes(n as QrExportSize) ? n : QR_DEFAULT_SIZE) as QrExportSize;
}

/**
 * Branded QR image for a Guest Entry Pass.
 *
 * Possession of the signed token *is* the credential, so there is no session
 * check — but the HMAC is verified before any work happens, and responses are
 * marked private so a shared cache never holds someone's pass.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token")?.trim() ?? "";
  const size = parseSize(searchParams.get("size"));
  const format = searchParams.get("format") === "svg" ? "svg" : "png";
  const mode: QrDisplayMode = searchParams.get("mode") === "brand" ? "brand" : "pass";
  const download = searchParams.get("download") === "1";

  if (!verifyPassTokenSignature(token)) {
    return NextResponse.json({ error: "Invalid pass token" }, { status: 400 });
  }

  const pass = await prisma.guestPass.findUnique({
    where: { tokenHash: hashPassToken(token) },
    select: { eventId: true, code: true },
  });
  if (!pass) {
    return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  }

  try {
    const [appUrl, centerImage, logoSize] = await Promise.all([
      getServerAppUrl(),
      qrBrandingService.resolveCenterImageUrl(pass.eventId),
      qrBrandingService.resolveLogoSize(pass.eventId),
    ]);
    const target = buildPassUrl(appUrl, token);
    const filename = `celeventic-entry-pass-${pass.code}`;

    if (format === "svg") {
      const svg = await generateBrandedQrSvg(target, centerImage, size, mode, logoSize);
      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "private, max-age=3600",
          ...(download ? { "Content-Disposition": `attachment; filename="${filename}.svg"` } : {}),
        },
      });
    }

    const png = await generateBrandedQrPng(target, centerImage, size, mode, logoSize);
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600",
        ...(download
          ? { "Content-Disposition": `attachment; filename="${filename}-${size}.png"` }
          : {}),
      },
    });
  } catch {
    return NextResponse.json({ error: "Pass QR generation failed" }, { status: 500 });
  }
}
