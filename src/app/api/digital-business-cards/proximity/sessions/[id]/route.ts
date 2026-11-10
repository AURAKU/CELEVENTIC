import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requestClientIp } from "@/lib/http/client-ip";
import {
  approveProximityConnect,
  cancelProximitySession,
  declineProximityConnect,
  getProximitySessionForUser,
  requestProximityConnect,
} from "@/services/digital-business-card/proximity.service";

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.enum(["request", "approve", "decline", "cancel", "complete"]),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const view = await getProximitySessionForUser(session.user.id, id);
  if (!view) return NextResponse.json({ error: "Tap session not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: view });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const ip = requestClientIp(req);
  const body = await req.json().catch(() => null);
  const fromQuery = req.nextUrl.searchParams.get("action");
  const parsed = actionSchema.safeParse(
    body && typeof body === "object" && "action" in body ? body : { action: fromQuery }
  );
  if (!parsed.success) return NextResponse.json({ error: "Unknown Tap action" }, { status: 400 });
  try {
    if (parsed.data.action === "complete") {
      const view = await getProximitySessionForUser(session.user.id, id);
      if (!view) return NextResponse.json({ error: "Tap session not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: view });
    }
    if (parsed.data.action === "request") {
      const view = await requestProximityConnect(session.user.id, id, ip);
      return NextResponse.json({ success: true, data: view });
    }
    if (parsed.data.action === "approve") {
      const result = await approveProximityConnect(session.user.id, id, ip);
      return NextResponse.json({ success: true, data: result.view });
    }
    if (parsed.data.action === "decline") {
      const view = await declineProximityConnect(session.user.id, id, ip);
      return NextResponse.json({ success: true, data: view });
    }
    const view = await cancelProximitySession(session.user.id, id, ip);
    return NextResponse.json({ success: true, data: view });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tap action failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
