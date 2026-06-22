import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { complianceService } from "@/services/legal/compliance.service";

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

const actionSchema = z.object({
  action: z.enum(["export", "deletion", "cookie"]),
  cookieValue: z.enum(["essential", "all"]).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = actionSchema.parse(await req.json());

    if (body.action === "export") {
      const data = await complianceService.exportUserData(session.user.id);
      return NextResponse.json({ success: true, data });
    }

    if (body.action === "deletion") {
      const result = await complianceService.requestDataDeletion(session.user.id);
      return NextResponse.json({ success: true, data: result });
    }

    if (body.action === "cookie" && body.cookieValue) {
      await complianceService.recordConsent(session.user.id, "COOKIE", { value: body.cookieValue });
      const status = await complianceService.getComplianceStatus(session.user.id);
      return NextResponse.json({ success: true, data: status });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Request failed" }, { status: 400 });
  }
}
