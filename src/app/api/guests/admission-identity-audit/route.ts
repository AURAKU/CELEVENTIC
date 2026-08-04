import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdminRole } from "@/lib/roles";
import { authorizeSearch, guardRate } from "@/lib/guest-search/api-auth";
import { searchAdmissionIdentityAudit } from "@/services/admission-identity/admission-identity-audit.service";
import type { AuditIssueFilter } from "@/lib/admission-identity/classify";
import type { GuestStatus, InvitationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/guests/admission-identity-audit
 * Server-side invitation-party admission identity audit (paginated).
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");
  const global = url.searchParams.get("global") === "1";

  if (!eventId && !(global && isAdminRole(session.user.role))) {
    return NextResponse.json(
      { error: "Select an event, or use global search as an administrator." },
      { status: 400 }
    );
  }

  if (eventId) {
    const auth = await authorizeSearch(eventId);
    if (auth.error) return auth.error;
    const limited = await guardRate(req, auth.ctx.userId, "admission-identity-audit", 120, 60);
    if (limited) return limited;
  } else {
    const limited = await guardRate(req, session.user.id, "admission-identity-audit-global", 60, 60);
    if (limited) return limited;
  }

  const result = await searchAdmissionIdentityAudit({
    eventId: eventId || null,
    global: global && isAdminRole(session.user.role),
    q: url.searchParams.get("q") ?? "",
    issue: (url.searchParams.get("issue") as AuditIssueFilter) || "all_incomplete",
    invitationStatus: (url.searchParams.get("invitationStatus") as InvitationStatus) || null,
    guestStatus: (url.searchParams.get("guestStatus") as GuestStatus) || null,
    admissionStatus: url.searchParams.get("admissionStatus"),
    createdFrom: url.searchParams.get("createdFrom"),
    createdTo: url.searchParams.get("createdTo"),
    updatedFrom: url.searchParams.get("updatedFrom"),
    updatedTo: url.searchParams.get("updatedTo"),
    page: Number(url.searchParams.get("page") ?? 1),
    limit: Number(url.searchParams.get("limit") ?? 20),
  });

  return NextResponse.json({ success: true, data: result });
}
