import { NextResponse } from "next/server";
import { authorizeSearch, guardRate } from "@/lib/guest-search/api-auth";
import { scanEventPartyIsolation } from "@/services/admission-identity/admission-identity-audit.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/guests/party-isolation-audit?eventId=
 * Lists every cross-party pollution finding on the event (all invitations).
 */
export async function GET(req: Request) {
  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  const auth = await authorizeSearch(eventId);
  if (auth.error) return auth.error;

  const limited = await guardRate(req, auth.ctx.userId, "party-isolation-audit", 60, 60);
  if (limited) return limited;

  const result = await scanEventPartyIsolation(eventId);
  return NextResponse.json({
    success: true,
    data: {
      findings: result.findings,
      highConfidence: result.highConfidence,
      total: result.findings.length,
    },
  });
}
