import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { complianceService } from "@/services/legal/compliance.service";
import { CURRENT_LEGAL_VERSION } from "@/lib/legal/constants";

const schema = z.object({
  type: z.enum(["TERMS", "PRIVACY", "COOKIE", "PORTFOLIO"]).optional(),
  version: z.string().optional(),
  termsVersion: z.string().optional(),
  privacyVersion: z.string().optional(),
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

    const versions = await complianceService.getCurrentVersions();
    const termsVersion =
      body.termsVersion ?? body.version ?? versions.terms?.version ?? CURRENT_LEGAL_VERSION;
    const privacyVersion =
      body.privacyVersion ?? versions.privacy?.version ?? CURRENT_LEGAL_VERSION;

    if (body.acceptTerms && body.acceptPrivacy) {
      await complianceService.recordLegalAcceptance(
        session.user.id,
        termsVersion,
        privacyVersion
      );
    } else {
      if (body.acceptTerms || body.type === "TERMS") {
        await complianceService.recordConsent(session.user.id, "TERMS", {
          version: termsVersion,
        });
      }

      if (body.acceptPrivacy || body.type === "PRIVACY") {
        await complianceService.recordConsent(session.user.id, "PRIVACY", {
          version: privacyVersion,
        });
      }
    }

    if (body.type === "COOKIE" && body.value) {
      await complianceService.recordConsent(session.user.id, "COOKIE", { value: body.value });
    }

    if (body.type === "PORTFOLIO" && body.value) {
      await complianceService.recordConsent(session.user.id, "PORTFOLIO", { value: body.value });
    }

    const status = await complianceService.getComplianceStatus(session.user.id);
    return NextResponse.json({ success: true, data: status });
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes("versions unavailable")
        ? "Legal policy versions are not available. Please refresh and try again."
        : "Invalid consent data";
    return NextResponse.json({ error: message }, { status: 400 });
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
