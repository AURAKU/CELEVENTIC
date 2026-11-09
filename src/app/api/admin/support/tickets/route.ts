import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { parsePaginationFromUrl } from "@/lib/pagination";
import { supportTicketService } from "@/services/support/support-ticket.service";
import type { UserRole } from "@prisma/client";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdminRole(session.user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const { page, limit } = parsePaginationFromUrl(req.url);
  const data = await supportTicketService.listForAdmin({
    page,
    limit,
    status: url.searchParams.get("status") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    assignedToId: url.searchParams.get("assignedToId") ?? undefined,
  });
  return NextResponse.json({ success: true, data });
}
