import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import {
  getPlatformDefaultProviders,
  setPlatformDefaultProviders,
} from "@/lib/integrations/platform-provider-settings";
import { isProviderEnabled } from "@/lib/integrations/integration-runtime";

const patchSchema = z.object({
  payments: z.enum(["PAYSTACK"]).optional(),
  email: z.string().min(1).optional(),
  sms: z.string().min(1).optional(),
  whatsapp: z.string().min(1).optional(),
});

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const defaults = await getPlatformDefaultProviders();
  const [payOk, emailOk, smsOk, waOk] = await Promise.all([
    isProviderEnabled(defaults.payments),
    isProviderEnabled(defaults.email),
    isProviderEnabled(defaults.sms),
    isProviderEnabled(defaults.whatsapp),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      defaults,
      status: {
        payments: { provider: defaults.payments, enabled: payOk },
        email: { provider: defaults.email, enabled: emailOk },
        sms: { provider: defaults.sms, enabled: smsOk },
        whatsapp: { provider: defaults.whatsapp, enabled: waOk },
      },
    },
  });
}

export async function PATCH(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = patchSchema.parse(await req.json());
    const defaults = await setPlatformDefaultProviders(body);

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "platform_default_providers",
      details: body,
    });

    return NextResponse.json({ success: true, data: defaults });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update defaults" }, { status: 500 });
  }
}
