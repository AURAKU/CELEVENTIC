import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getInvitationAdmission } from "@/services/admission/admission.service";
import { resolvePostAdmissionEnabled } from "@/lib/admission/canonical-companion";
import { repairInviteLink } from "@/services/invitations/invite-link-resolver.service";

// Admission status must never be cached, a scan or reset has to reflect on the
// guest's next poll immediately (spec §27).
export const dynamic = "force-dynamic";
export const revalidate = 0;

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

const noStore = { "Cache-Control": "no-store, no-cache, must-revalidate" };

/**
 * Public, non-sensitive admission status for portal polling. Returns only
 * counts + lock state, never seating, gifts, or other guests' details.
 */
export async function GET(req: Request, { params }: { params: Promise<{ link: string }> }) {
  const rl = await rateLimit(`admission-status:${clientIp(req)}`, 120, 60);
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: noStore });
  }

  const { link } = await params;
  const select = { id: true, eventId: true, postAdmissionEnabled: true };
  let invitation = await prisma.invitation.findUnique({
    where: { uniqueLink: link },
    select,
  });

  // The poller inherits whatever token the page was opened with, so it has to
  // tolerate the same mangled links the page does — otherwise a repaired
  // invitation renders but its admission status silently reports "disabled".
  if (!invitation) {
    const repaired = await repairInviteLink(link);
    if (repaired) {
      invitation = await prisma.invitation.findUnique({ where: { uniqueLink: repaired }, select });
    }
  }

  if (!invitation) {
    return NextResponse.json(
      { enabled: false, unlocked: false },
      { headers: noStore }
    );
  }

  const portalEnabled = await resolvePostAdmissionEnabled({
    eventId: invitation.eventId,
    invitationId: invitation.id,
    invitationEnabled: invitation.postAdmissionEnabled,
  });

  if (!portalEnabled) {
    // Do not reveal whether a locked/absent invitation exists.
    return NextResponse.json(
      { enabled: false, unlocked: false },
      { headers: noStore }
    );
  }

  const summary = await getInvitationAdmission(invitation.id);
  if (!summary) {
    return NextResponse.json({ enabled: false, unlocked: false }, { headers: noStore });
  }

  return NextResponse.json(
    {
      enabled: true,
      unlocked: summary.canAccessPortal && summary.admittedCount > 0,
      state: summary.state,
      admittedCount: summary.admittedCount,
      remainingCount: summary.remainingCount,
      allowance: summary.allowance,
    },
    { headers: noStore }
  );
}
