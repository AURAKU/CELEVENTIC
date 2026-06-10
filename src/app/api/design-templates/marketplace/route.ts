import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { templateMarketplaceService } from "@/services/template-engine/template-marketplace.service";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const templates = await templateMarketplaceService.getMarketplace({
    category: params.get("category") ?? undefined,
    premium: params.get("premium") === "true" ? true : undefined,
  });
  return NextResponse.json({ success: true, data: templates });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.action === "purchase") {
    const result = await templateMarketplaceService.purchaseTemplate(session.user.id, body.templateId);
    return NextResponse.json({ success: true, data: result });
  }

  if (body.action === "favorite") {
    const result = await templateMarketplaceService.toggleFavorite(session.user.id, body.templateId);
    return NextResponse.json({ success: true, data: result });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
