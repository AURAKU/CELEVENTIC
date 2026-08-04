import { NextResponse } from "next/server";
import { authorizeSearch, guardRate } from "@/lib/guest-search/api-auth";
import { findSuspectedDuplicates } from "@/services/admission-identity/admission-identity-audit.service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  const auth = await authorizeSearch(eventId);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx.userId, "duplicates-list", 60, 60);
  if (limited) return limited;

  const pairs = await findSuspectedDuplicates(eventId);
  return NextResponse.json({ success: true, data: { pairs, total: pairs.length } });
}
