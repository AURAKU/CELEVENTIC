import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { complianceService } from "@/services/legal/compliance.service";
const schema = z.object({
  type: z.enum(["TERMS", "PRIVACY", "COOKIE", "PORTFOLIO"]),
  version: z.string().optional(),
  value: z.string().optional(),
  acceptTerms: z.boolean().optional(),
  acceptPrivacy: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = schema.parse(await req.json());

    if (body.acceptTerms || body.type === "TERMS") {
      const versions = await complianceService.getCurrentVersions();
      await complianceService.recordConsent(session.user.id, "TERMS", {
        version: body.version ?? versions.terms?.version,
      });
    }

    if (body.acceptPrivacy || body.type === "PRIVACY") {
      const versions = await complianceService.getCurrentVersions();
      await complianceService.recordConsent(session.user.id, "PRIVACY", {
        version: body.version ?? versions.privacy?.version,
      });
    }

    if (body.type === "COOKIE" && body.value) {
      await complianceService.recordConsent(session.user.id, "COOKIE", { value: body.value });
    }

    if (body.type === "PORTFOLIO" && body.value) {
      await complianceService.recordConsent(session.user.id, "PORTFOLIO", { value: body.value });
    }

    const status = await complianceService.getComplianceStatus(session.user.id);
    return NextResponse.json({ success: true, data: status });
  } catch {
    return NextResponse.json({ error: "Invalid consent data" }, { status: 400 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [status, history] = await Promise.all([
    complianceService.getComplianceStatus(session.user.id),
    complianceService.getConsentHistory(session.user.id),
  ]);
  return NextResponse.json({ success: true, data: { ...status, history } });
}
