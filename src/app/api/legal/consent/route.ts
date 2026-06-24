import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { complianceService } from "@/services/legal/compliance.service";

const schema = z
  .object({
    type: z.enum(["TERMS", "PRIVACY", "COOKIE", "PORTFOLIO"]).optional(),
    version: z.string().optional(),
    termsVersion: z.string().optional(),
    privacyVersion: z.string().optional(),
    value: z.string().optional(),
    acceptTerms: z.boolean().optional(),
    acceptPrivacy: z.boolean().optional(),
  })
  .passthrough();

function consentError(err: unknown) {
  if (err instanceof z.ZodError) {
    return NextResponse.json({ error: "Invalid consent data", details: err.flatten() }, { status: 400 });
  }
  if (err instanceof Error) {
    console.error("[legal/consent]", err);
    const safe =
      process.env.NODE_ENV === "development"
        ? err.message
        : "Could not save your acceptance. Please try again.";
    return NextResponse.json({ error: safe }, { status: 400 });
  }
  return NextResponse.json({ error: "Could not save your acceptance. Please try again." }, { status: 400 });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const raw = await req.json();
    const body = schema.parse(raw);

    const acceptingBoth = body.acceptTerms === true && body.acceptPrivacy === true;

    if (acceptingBoth) {
      await complianceService.recordLegalAcceptance(session.user.id);
    } else {
      const versions = await complianceService.getCurrentVersions();
      const termsVersion = body.termsVersion ?? body.version ?? versions.terms?.version;
      const privacyVersion = body.privacyVersion ?? versions.privacy?.version;

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
    return consentError(err);
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
