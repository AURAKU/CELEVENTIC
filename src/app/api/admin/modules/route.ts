import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/roles";
import { funeralService } from "@/services/funeral/funeral.service";
import type { UserRole } from "@prisma/client";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isAdminRole(session.user.role as UserRole)) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    walletTotals,
    devices,
    pendingTributes,
    recentScans,
    syncLogs,
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
      take: 15,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.wallet.aggregate({ _sum: { revenue: true, expenses: true, balance: true } }),
    prisma.offlineDevice.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: { select: { name: true } },
        event: { select: { title: true } },
      },
    }),
    prisma.tributeMessage.findMany({
      where: { approvalStatus: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { event: { select: { title: true, slug: true } } },
    }),
    prisma.qrScan.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { event: { select: { title: true } } },
    }),
    prisma.offlineSyncLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { device: { select: { deviceName: true } } },
    }),
  ]);

  const aiProviderSetting = await prisma.adminSetting.findUnique({
    where: { key: "ai.planner_provider" },
  });

  return NextResponse.json({
    success: true,
    data: {
      aiPlanner: {
        totalRequests: aiRequests,
        recent: recentAi,
        activeProvider: (aiProviderSetting?.value as { provider?: string })?.provider ?? "mock",
      },
      wallet: {
        totalWallets: wallets,
        totalRevenue: Number(walletTotals._sum.revenue ?? 0),
        totalExpenses: Number(walletTotals._sum.expenses ?? 0),
        totalBalance: Number(walletTotals._sum.balance ?? 0),
      },
      offlineQr: { devices: offlineDevices, checkins: offlineScans, deviceList: devices, syncLogs },
      funeral: { profiles: funeralProfiles, pendingTributes: tributesPending, tributeList: pendingTributes },
      memory: { vaults: memoryVaults, items: memoryItems },
      recentScans,
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
