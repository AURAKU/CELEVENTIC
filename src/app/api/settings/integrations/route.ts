import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { INTEGRATION_CATALOG } from "@/lib/integrations/integration-catalog";
import { isProviderEnabled } from "@/lib/integrations/integration-runtime";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/roles";
import type { UserRole } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const catalogStatus = await Promise.all(
    INTEGRATION_CATALOG.map(async (entry) => ({
      provider: entry.provider,
      label: entry.label,
      category: entry.category,
      description: entry.description,
      docsUrl: entry.docsUrl,
      configured: await isProviderEnabled(entry.provider),
      isCustom: false,
    }))
  );

  const customRows = await prisma.apiSetting.findMany({
    where: { provider: { startsWith: "CUSTOM_" } },
    orderBy: { label: "asc" },
  });

  const customStatus = await Promise.all(
    customRows.map(async (row) => ({
      provider: row.provider,
      label: row.label ?? row.provider,
      category: row.category,
      description: row.description ?? "Custom API integration",
      docsUrl: undefined as string | undefined,
      configured: row.isEnabled && (await isProviderEnabled(row.provider)),
      isCustom: true,
    }))
  );

  const isAdmin = isAdminRole(session.user.role as UserRole);

  return NextResponse.json({
    success: true,
    data: {
      integrations: [...catalogStatus, ...customStatus],
      canManage: isAdmin,
      manageUrl: "/admin/integrations",
    },
  });
}
