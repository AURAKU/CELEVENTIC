import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/require-admin";
import {
  listGuidesNeedingReview,
  markGuideVerified,
  markGuidesReviewRequiredByFeatureKey,
  setGuideReviewStatus,
} from "@/services/celeventic-guide/freshness.service";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const guides = await listGuidesNeedingReview();
  return NextResponse.json({ guides });
}

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  if (action === "mark-feature") {
    const result = await markGuidesReviewRequiredByFeatureKey(String(body.featureKey ?? ""), {
      status: body.status,
      note: body.note,
    });
    return NextResponse.json(result);
  }

  if (action === "verify") {
    const guide = await markGuideVerified(String(body.id ?? ""), {
      buildId: body.buildId ?? process.env.BUILD_ID ?? null,
      featureVersion: body.featureVersion ?? null,
    });
    return NextResponse.json({ guide });
  }

  if (action === "set-status") {
    const guide = await setGuideReviewStatus(String(body.id ?? ""), body.reviewStatus);
    return NextResponse.json({ guide });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
