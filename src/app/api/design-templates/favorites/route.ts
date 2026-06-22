import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { templateMarketplaceService } from "@/services/template-engine/template-marketplace.service";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const favorites = await templateMarketplaceService.getFavorites(session.user.id);
  return NextResponse.json({ success: true, data: favorites });
}
