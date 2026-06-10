import { NextResponse } from "next/server";
import { getSession, isAdminRole } from "@/lib/auth";
import { invitationAnalyticsService } from "@/services/invitation-os/invitation-analytics.service";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isAdminRole(session.user.role)) {
    const [organizer, godTier] = await Promise.all([
      invitationAnalyticsService.getOrganizerAnalytics(session.user.id),
      invitationAnalyticsService.getAdminGodTierAnalytics(),
    ]);
    return NextResponse.json({ success: true, data: { ...organizer, platform: godTier } });
  }

  const data = await invitationAnalyticsService.getOrganizerAnalytics(session.user.id);
  return NextResponse.json({ success: true, data });
}
