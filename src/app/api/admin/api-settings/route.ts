import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";

const PROVIDERS = [
  "PAYSTACK", "FLUTTERWAVE", "HUBTEL", "RESEND", "SMS", "WHATSAPP",
  "GOOGLE_MAPS", "CLOUDINARY", "OPENAI", "ANTHROPIC",
];

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const dbSettings = await prisma.apiSetting.findMany();
  const envMap: Record<string, boolean> = {
    PAYSTACK: !!process.env.PAYSTACK_SECRET_KEY,
    FLUTTERWAVE: !!process.env.FLUTTERWAVE_SECRET_KEY,
    HUBTEL: !!process.env.HUBTEL_CLIENT_ID,
    RESEND: !!process.env.RESEND_API_KEY,
    SMS: !!process.env.SMS_PROVIDER_API_KEY,
    WHATSAPP: !!process.env.WHATSAPP_BUSINESS_TOKEN,
    GOOGLE_MAPS: !!process.env.GOOGLE_MAPS_API_KEY,
    CLOUDINARY: !!process.env.CLOUDINARY_API_KEY,
    OPENAI: !!process.env.OPENAI_API_KEY,
    ANTHROPIC: !!process.env.ANTHROPIC_API_KEY,
  };

  const data = PROVIDERS.map((provider) => {
    const row = dbSettings.find((s) => s.provider === provider);
    return {
      provider,
      isEnabled: row?.isEnabled ?? false,
      envConfigured: envMap[provider] ?? false,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  });

  return NextResponse.json({ success: true, data });
}

export async function PATCH(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { provider, isEnabled } = z.object({
      provider: z.string(),
      isEnabled: z.boolean(),
    }).parse(await req.json());

    const setting = await prisma.apiSetting.upsert({
      where: { provider },
      create: { provider, isEnabled, config: {} },
      update: { isEnabled },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "api_setting",
      entityId: provider,
      details: { isEnabled },
    });

    return NextResponse.json({ success: true, data: setting });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
