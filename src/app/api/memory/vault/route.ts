import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { memoryService } from "@/services/memory/memory.service";
import { verifyEventAccess } from "@/lib/event-access";

const vaultSchema = z.object({
  eventId: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  privacyStatus: z.enum(["PUBLIC", "PRIVATE", "UNLISTED"]).optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  try {
    await verifyEventAccess(eventId, session.user.id, session.user.role);
    const data = await memoryService.getVaultDashboard(eventId, session.user.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Access denied" },
      { status: 403 }
    );
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = vaultSchema.parse(body);
    await verifyEventAccess(data.eventId, session.user.id, session.user.role);
    await memoryService.getOrCreateVault(data.eventId, session.user.id);
    const vault = await memoryService.updateVaultSettings(data.eventId, data);
    return NextResponse.json({ success: true, data: vault });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Vault update failed" }, { status: 500 });
  }
}
