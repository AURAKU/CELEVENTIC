import { NextResponse } from "next/server";
import { requireQrHubAccess } from "@/lib/qr-hub/qr-hub-guard";
import { eventQrHubService } from "@/services/qr-hub/event-qr-hub.service";
import { sharedVendorAccessService } from "@/services/qr-hub/shared-vendor-access.service";
import { eventQrLinkService } from "@/services/qr-hub/event-qr-link.service";
import { prisma } from "@/lib/prisma";
import { parsePaginationInput, paginatedResult } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const guard = await requireQrHubAccess(url.searchParams.get("eventId"));
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const overview = await eventQrHubService.overview(guard.eventId, guard.userId);

  const guestPassPage = parsePaginationInput({
    page: url.searchParams.get("passPage"),
    limit: url.searchParams.get("passLimit") ?? "20",
  });
  const [guestPasses, guestPassTotal, recentScans] = await Promise.all([
    prisma.guestPass.findMany({
      where: { eventId: guard.eventId },
      orderBy: { updatedAt: "desc" },
      skip: guestPassPage.skip,
      take: guestPassPage.limit,
      select: {
        id: true,
        displayName: true,
        code: true,
        status: true,
        partySize: true,
        admittedCount: true,
        tokenPrefix: true,
        updatedAt: true,
      },
    }),
    prisma.guestPass.count({ where: { eventId: guard.eventId } }),
    guard.canViewScans
      ? prisma.sharedAccessPassScan.findMany({
          where: { eventId: guard.eventId },
          orderBy: { createdAt: "desc" },
          take: 25,
          select: {
            id: true,
            result: true,
            gate: true,
            operatorRoleNote: true,
            vendorLabel: true,
            offline: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      ...overview,
      guestPasses: paginatedResult(
        guestPasses,
        guestPassTotal,
        guestPassPage.page,
        guestPassPage.limit
      ),
      vendorScans: recentScans,
      permissions: {
        canManage: guard.canManage,
        canDownload: guard.canDownload,
        canManageVendor: guard.canManageVendor,
        canViewScans: guard.canViewScans,
      },
    },
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const eventId = typeof body?.eventId === "string" ? body.eventId : null;
  const action = typeof body?.action === "string" ? body.action : null;
  const guard = await requireQrHubAccess(eventId);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    switch (action) {
      case "ensure_vendor": {
        if (!guard.canManageVendor) {
          return NextResponse.json({ error: "Not allowed to manage vendor access" }, { status: 403 });
        }
        const view = await sharedVendorAccessService.toHubView(guard.eventId);
        return NextResponse.json({ success: true, data: view });
      }
      case "regenerate_vendor": {
        if (!guard.canManageVendor) {
          return NextResponse.json({ error: "Not allowed to regenerate vendor access" }, { status: 403 });
        }
        const result = await sharedVendorAccessService.ensure(guard.eventId, {
          createdById: guard.userId,
          regenerate: true,
        });
        return NextResponse.json({
          success: true,
          data: await sharedVendorAccessService.toHubView(guard.eventId),
          rawTokenOnce: result.rawToken,
          warning: result.warning,
        });
      }
      case "revoke_vendor": {
        if (!guard.canManageVendor) {
          return NextResponse.json({ error: "Not allowed to revoke vendor access" }, { status: 403 });
        }
        await sharedVendorAccessService.revoke(
          guard.eventId,
          guard.userId,
          typeof body?.reason === "string" ? body.reason : undefined
        );
        return NextResponse.json({ success: true });
      }
      case "create_custom": {
        if (!guard.canManage) {
          return NextResponse.json({ error: "Not allowed to create custom QR links" }, { status: 403 });
        }
        const link = await eventQrLinkService.createCustom(guard.eventId, {
          title: String(body?.title || "Custom link"),
          subtitle: typeof body?.subtitle === "string" ? body.subtitle : undefined,
          destinationUrl: String(body?.destinationUrl || ""),
          createdById: guard.userId,
        });
        return NextResponse.json({ success: true, data: link });
      }
      case "set_link_status": {
        if (!guard.canManage) {
          return NextResponse.json({ error: "Not allowed" }, { status: 403 });
        }
        await eventQrLinkService.setStatus(
          String(body?.linkId || ""),
          guard.eventId,
          String(body?.status || "DISABLED") as "ACTIVE" | "DISABLED" | "REVOKED",
          guard.userId
        );
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "QR Hub action failed" },
      { status: 400 }
    );
  }
}
