import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyEventAccess } from "@/lib/event-access";
import { getUnifiedScanLog } from "@/services/admission/scan-log.service";

export const dynamic = "force-dynamic";

/** Every scan at the gate — guest QR, entry pass, vendor card — newest first. */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "eventId required" }, { status: 400 });
  }

  await verifyEventAccess(eventId, session.user.id, session.user.role);

  const data = await getUnifiedScanLog(eventId, {
    page: Number(searchParams.get("page") ?? 1) || 1,
    limit: Number(searchParams.get("limit") ?? 20) || 20,
    q: searchParams.get("q") ?? searchParams.get("search") ?? "",
  });

  return NextResponse.json(
    { success: true, data },
    { headers: { "Cache-Control": "no-store" } }
  );
}
