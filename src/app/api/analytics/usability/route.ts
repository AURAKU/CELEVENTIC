import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

const ALLOWED = new Set([
  "page_viewed",
  "primary_action_clicked",
  "onboarding_completed",
  "onboarding_skipped",
  "flow_abandoned",
  "search_used",
  "feature_discovered",
  "error_encountered",
]);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const body = await req.json().catch(() => ({}));
  const event = String(body.event ?? "");

  if (!ALLOWED.has(event)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const path = String(body.path ?? "").slice(0, 200);

  if (session?.user?.id) {
    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "UsabilityEvent",
      entityId: event,
      details: { path, meta: { step: body.step, feature: body.feature } },
    }).catch(() => undefined);
  }

  return NextResponse.json({ success: true });
}
