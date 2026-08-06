import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateBrandedQrPng, generateBrandedQrSvg } from "@/lib/qr/branded-qr-generator";
import { qrBrandingService } from "@/services/qr/qr-branding.service";
import {
  CELEVENTIC_OFFICIAL_LOGO,
  QR_DEFAULT_SIZE,
  QR_EXPORT_SIZES,
  type QrDisplayMode,
  type QrExportSize,
} from "@/lib/qr/qr-constants";
import {
  hashVendorTeamToken,
  vendorTeamTokenFromNonce,
  verifyVendorTeamTokenSignature,
} from "@/lib/vendor-pass/token";
import { generateVendorAccessCardPng } from "@/lib/vendor-pass/access-card-image";

export const dynamic = "force-dynamic";

function parseSize(raw: string | null): QrExportSize {
  const n = Number.parseInt(raw ?? String(QR_DEFAULT_SIZE), 10);
  return (QR_EXPORT_SIZES.includes(n as QrExportSize) ? n : QR_DEFAULT_SIZE) as QrExportSize;
}

async function resolvePass(req: Request) {
  const { searchParams } = new URL(req.url);
  const publicToken = searchParams.get("publicToken")?.trim() ?? "";
  const rawToken = searchParams.get("token")?.trim() ?? "";

  if (publicToken) {
    const pass = await prisma.vendorTeamPass.findUnique({
      where: { publicToken },
      select: {
        id: true,
        eventId: true,
        tokenNonce: true,
        title: true,
        vendorName: true,
        passMode: true,
        passType: true,
        categoryLabel: true,
        teamCapacity: true,
        admittedCount: true,
        admissionCode: true,
        accessZones: true,
        validUntil: true,
        contactName: true,
        status: true,
        archivedAt: true,
        event: { select: { title: true } },
      },
    });
    if (!pass || pass.archivedAt) return null;
    if (pass.status === "REVOKED" || pass.status === "EXPIRED") return null;
    return { ...pass, token: vendorTeamTokenFromNonce(pass.tokenNonce) };
  }

  if (!rawToken || !verifyVendorTeamTokenSignature(rawToken)) return null;
  const pass = await prisma.vendorTeamPass.findUnique({
    where: { tokenHash: hashVendorTeamToken(rawToken) },
    select: {
      id: true,
      eventId: true,
      tokenNonce: true,
      title: true,
      vendorName: true,
      passMode: true,
      passType: true,
      categoryLabel: true,
      teamCapacity: true,
      admittedCount: true,
      admissionCode: true,
      accessZones: true,
      validUntil: true,
      contactName: true,
      status: true,
      archivedAt: true,
      event: { select: { title: true } },
    },
  });
  if (!pass || pass.archivedAt) return null;
  if (pass.status === "REVOKED" || pass.status === "EXPIRED") return null;
  return { ...pass, token: rawToken };
}

function parseZones(value: unknown): string[] {
  if (!value) return ["General Event Area"];
  if (Array.isArray(value)) return value.map(String).map((z) => z.trim()).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return value.split(/[·|,]/).map((z) => z.trim()).filter(Boolean);
    }
  }
  return ["General Event Area"];
}

/**
 * Branded vendor/team QR (Celeventic center logo) or full access-card PNG.
 *
 * Auth = possession of publicToken or signed cvt1 token (same model as guest passes).
 * Query:
 *   - publicToken | token
 *   - kind=qr|card (default card for download-friendly access badge; qr for raw QR)
 *   - format=png|svg (svg only for kind=qr)
 *   - mode=brand|pass (QR modules; default brand for Celeventic teal)
 *   - size=512|1024|2048
 *   - download=1
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind") === "qr" ? "qr" : "card";
  const size = parseSize(searchParams.get("size"));
  const format = searchParams.get("format") === "svg" ? "svg" : "png";
  const mode: QrDisplayMode = searchParams.get("mode") === "pass" ? "pass" : "brand";
  const download = searchParams.get("download") === "1";

  const pass = await resolvePass(req);
  if (!pass) {
    return NextResponse.json({ error: "Vendor pass not found" }, { status: 404 });
  }

  try {
    // Vendor/team passes always use the Celeventic logo — never event QR center art.
    const centerImage = CELEVENTIC_OFFICIAL_LOGO;
    const logoSize = await qrBrandingService.resolveLogoSize(pass.eventId);
    const safeVendor = pass.vendorName.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "vendor";
    const filenameBase = `celeventic-vendor-pass-${safeVendor}-${pass.admissionCode}`;

    if (kind === "card") {
      const png = await generateVendorAccessCardPng({
        token: pass.token,
        title: pass.title,
        vendorName: pass.vendorName,
        eventTitle: pass.event.title,
        passMode: pass.passMode,
        passType: pass.passType,
        categoryLabel: pass.categoryLabel,
        teamCapacity: pass.teamCapacity,
        admittedCount: pass.admittedCount,
        admissionCode: pass.admissionCode,
        accessZones: parseZones(pass.accessZones),
        validUntil: pass.validUntil?.toISOString() ?? null,
        contactName: pass.contactName,
        status: pass.status,
        logoSize,
      });
      return new NextResponse(new Uint8Array(png), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "private, max-age=300",
          ...(download
            ? { "Content-Disposition": `attachment; filename="${filenameBase}-card.png"` }
            : {}),
        },
      });
    }

    if (format === "svg") {
      const svg = await generateBrandedQrSvg(pass.token, centerImage, size, mode, logoSize);
      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "private, max-age=300",
          ...(download
            ? { "Content-Disposition": `attachment; filename="${filenameBase}.svg"` }
            : {}),
        },
      });
    }

    const png = await generateBrandedQrPng(pass.token, centerImage, size, mode, logoSize);
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=300",
        ...(download
          ? { "Content-Disposition": `attachment; filename="${filenameBase}-${size}.png"` }
          : {}),
      },
    });
  } catch (error) {
    console.error("[vendor-pass/qr-image]", error);
    return NextResponse.json({ error: "Vendor pass image generation failed" }, { status: 500 });
  }
}
