import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import {
  getInvitationFeatureFlags,
  saveInvitationFeatureFlags,
} from "@/lib/invitation/admin-feature-flags";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await getInvitationFeatureFlags();
  return NextResponse.json({ success: true, data });
}

export async function PATCH(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const data = await saveInvitationFeatureFlags(body);
  return NextResponse.json({ success: true, data });
}
