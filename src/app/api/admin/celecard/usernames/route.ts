import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Permission } from "@/lib/rbac/types";
import { requireCeleCardPermission } from "@/lib/require-admin";
import {
  CeleYouUsernameError,
  adminReserveUsername,
  listAdminUsernames,
  listUsernameHistory,
} from "@/services/digital-business-card/username.service";

export const dynamic = "force-dynamic";

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function GET(req: NextRequest) {
  const session = await requireCeleCardPermission(Permission.CELECARD_VIEW);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const history = url.searchParams.get("history");
  if (history) {
    const rows = await listUsernameHistory(history);
    return NextResponse.json({ success: true, data: { username: history, events: rows } });
  }
  const data = await listAdminUsernames({
    search: url.searchParams.get("search"),
    kind: url.searchParams.get("kind"),
    page: url.searchParams.get("page"),
    limit: url.searchParams.get("limit"),
  });
  return NextResponse.json({ success: true, data });
}

const reserveSchema = z.object({
  username: z.string().min(1).max(40),
  reason: z.string().min(8).max(500),
});

export async function POST(req: NextRequest) {
  const session = await requireCeleCardPermission(Permission.CELECARD_SUSPEND);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = reserveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const row = await adminReserveUsername({
      username: parsed.data.username,
      actorId: session.user.id,
      reason: parsed.data.reason,
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    if (error instanceof CeleYouUsernameError) {
      return NextResponse.json({ error: error.message, reason: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not reserve that username." }, { status: 500 });
  }
}
