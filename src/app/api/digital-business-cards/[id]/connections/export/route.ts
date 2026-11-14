import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { requestClientIp } from "@/lib/http/client-ip";
import { exportOwnerConnections } from "@/services/celeyou-connect/workspace.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const ip = requestClientIp(req);
  const limited = await rateLimit(`celecard-export:${session.user.id}:${ip}`, 8, 3600);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many exports. Try again later." }, { status: 429 });
  }
  const data = await exportOwnerConnections(session.user.id, id);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(data.csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="celeyou-connections.csv"`,
      "Cache-Control": "no-store",
      "X-CeleYou-Export-Count": String(data.count),
    },
  });
}
