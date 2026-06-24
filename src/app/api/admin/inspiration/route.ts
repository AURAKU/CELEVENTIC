import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { inspirationEngineService } from "@/services/inspiration/inspiration-engine.service";
import { parsePaginationFromUrl } from "@/lib/pagination";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { page, limit } = parsePaginationFromUrl(req.url);
    const params = new URL(req.url).searchParams;
    if (params.get("view") === "domains") {
      const domains = await inspirationEngineService.listDomainPolicies();
      return NextResponse.json({ success: true, data: domains });
    }
    const pending = await inspirationEngineService.adminListPending(page, limit);
    return NextResponse.json({ success: true, data: pending });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

const reviewSchema = z.object({
  sourceId: z.string(),
  reviewStatus: z.enum(["APPROVED", "REJECTED"]),
});

const domainSchema = z.object({
  domain: z.string().min(3),
  policyType: z.enum(["ALLOWED", "BANNED"]),
  reason: z.string().optional(),
});

export async function POST(req: Request) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (body.action === "domain") {
      const data = domainSchema.parse(body);
      const policy = await inspirationEngineService.upsertDomainPolicy(
        data.domain,
        data.policyType,
        data.reason,
        session.user.id
      );
      return NextResponse.json({ success: true, data: policy });
    }
    const data = reviewSchema.parse(body);
    await inspirationEngineService.adminReview(data.sourceId, data.reviewStatus, session.user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Action failed" }, { status: 400 });
  }
}
