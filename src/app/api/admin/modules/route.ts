import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/roles";
import { funeralService } from "@/services/funeral/funeral.service";
import { parsePaginationInput, paginatedResult } from "@/lib/pagination";
import type { UserRole } from "@prisma/client";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role as UserRole)) {
    return null;
  }
  return session;
}

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const ai = parsePaginationInput(
    { page: url.searchParams.get("aiPage"), limit: url.searchParams.get("aiLimit") },
    { limit: 15 }
  );
  const device = parsePaginationInput(
    { page: url.searchParams.get("devicePage"), limit: url.searchParams.get("deviceLimit") },
    { limit: 20 }
  );
  const tribute = parsePaginationInput(
    { page: url.searchParams.get("tributePage"), limit: url.searchParams.get("tributeLimit") },
    { limit: 20 }
  );
  const scan = parsePaginationInput(
    { page: url.searchParams.get("scanPage"), limit: url.searchParams.get("scanLimit") },
    { limit: 20 }
  );
  const sync = parsePaginationInput(
    { page: url.searchParams.get("syncPage"), limit: url.searchParams.get("syncLimit") },
    { limit: 10 }
  );

  const [
    aiRequests,
    wallets,
    offlineDevices,
    offlineScans,
    funeralProfiles,
    tributesPending,
    memoryVaults,
    memoryItems,
    recentAi,
    recentAiTotal,
    walletTotals,
    devices,
    devicesTotal,
    pendingTributes,
    pendingTributesTotal,
    recentScans,
    recentScansTotal,
    syncLogs,
    syncLogsTotal,
  ] = await Promise.all([
    prisma.aiRequest.count(),
    prisma.wallet.count(),
    prisma.offlineDevice.count(),
    prisma.offlineCheckin.count(),
    prisma.funeralProfile.count(),
    prisma.tributeMessage.count({ where: { approvalStatus: "PENDING" } }),
    prisma.memoryVault.count(),
    prisma.eventMemory.count(),
    prisma.aiRequest.findMany({
      orderBy: { createdAt: "desc" },
      skip: ai.skip,
      take: ai.limit,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.aiRequest.count(),
    prisma.wallet.aggregate({ _sum: { revenue: true, expenses: true, balance: true } }),
    prisma.offlineDevice.findMany({
      orderBy: { createdAt: "desc" },
      skip: device.skip,
      take: device.limit,
      include: {
        user: { select: { name: true } },
        event: { select: { title: true } },
      },
    }),
    prisma.offlineDevice.count(),
    prisma.tributeMessage.findMany({
      where: { approvalStatus: "PENDING" },
      orderBy: { createdAt: "desc" },
      skip: tribute.skip,
      take: tribute.limit,
      include: { event: { select: { title: true, slug: true } } },
    }),
    prisma.tributeMessage.count({ where: { approvalStatus: "PENDING" } }),
    prisma.qrScan.findMany({
      orderBy: { createdAt: "desc" },
      skip: scan.skip,
      take: scan.limit,
      include: { event: { select: { title: true } } },
    }),
    prisma.qrScan.count(),
    prisma.offlineSyncLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: sync.skip,
      take: sync.limit,
      include: { device: { select: { deviceName: true } } },
    }),
    prisma.offlineSyncLog.count(),
  ]);

  const aiProviderSetting = await prisma.adminSetting.findUnique({
    where: { key: "ai.planner_provider" },
  });

  return NextResponse.json({
    success: true,
    data: {
      aiPlanner: {
        totalRequests: aiRequests,
        recent: paginatedResult(recentAi, recentAiTotal, ai.page, ai.limit),
        activeProvider: (aiProviderSetting?.value as { provider?: string })?.provider ?? "mock",
      },
      wallet: {
        totalWallets: wallets,
        totalRevenue: Number(walletTotals._sum.revenue ?? 0),
        totalExpenses: Number(walletTotals._sum.expenses ?? 0),
        totalBalance: Number(walletTotals._sum.balance ?? 0),
      },
      offlineQr: {
        devices: offlineDevices,
        checkins: offlineScans,
        deviceList: paginatedResult(devices, devicesTotal, device.page, device.limit),
        syncLogs: paginatedResult(syncLogs, syncLogsTotal, sync.page, sync.limit),
      },
      funeral: {
        profiles: funeralProfiles,
        pendingTributes: tributesPending,
        tributeList: paginatedResult(pendingTributes, pendingTributesTotal, tribute.page, tribute.limit),
      },
      memory: { vaults: memoryVaults, items: memoryItems },
      recentScans: paginatedResult(recentScans, recentScansTotal, scan.page, scan.limit),
    },
  });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();

    if (body.action === "revoke_device") {
      const deviceId = z.string().parse(body.deviceId);
      await prisma.offlineDevice.update({
        where: { id: deviceId },
        data: { isAuthorized: false },
      });
      return NextResponse.json({ success: true });
    }

    if (body.action === "moderate_tribute") {
      const data = z.object({
        tributeId: z.string(),
        status: z.enum(["APPROVED", "REJECTED"]),
      }).parse(body);
      const updated = await funeralService.moderateTribute(data.tributeId, data.status);
      return NextResponse.json({ success: true, data: updated });
    }

    if (body.action === "set_ai_provider") {
      const provider = z.enum(["mock", "openai", "anthropic"]).parse(body.provider);
      await prisma.adminSetting.upsert({
        where: { key: "ai.planner_provider" },
        create: { key: "ai.planner_provider", value: { provider }, category: "ai" },
        update: { value: { provider } },
      });
      return NextResponse.json({ success: true, data: { provider } });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
