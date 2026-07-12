import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { entitlementService } from "@/services/entitlements/entitlement.service";
import { verifyEventAccess } from "@/lib/event-access";
import type { UserRole } from "@prisma/client";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; featureKey: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, featureKey } = await params;
    await verifyEventAccess(id, session.user.id, session.user.role as UserRole);
    const result = await entitlementService.canUseFeature({
      userId: session.user.id,
      eventId: id,
      featureKey,
      role: session.user.role as UserRole,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Check failed" },
      { status: 400 }
    );
  }
}
