import { NextResponse } from "next/server";
import { getInvitationFeatureFlags } from "@/lib/invitation/admin-feature-flags";
import { getInvitationMediaLimits } from "@/lib/invitation/media-limits";

/** Read-only studio settings for users (feature flags + upload limits). */
export async function GET() {
  const [flags, limits] = await Promise.all([
    getInvitationFeatureFlags(),
    getInvitationMediaLimits(),
  ]);
  return NextResponse.json({ success: true, data: { flags, limits } });
}
