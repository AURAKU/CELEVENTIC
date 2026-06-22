import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAdminRole } from "@/lib/auth";
import { translationService } from "@/services/i18n/translation.service";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const namespace = searchParams.get("namespace") ?? undefined;
  await translationService.seedTranslations();
  const rows = await translationService.listForAdmin(namespace);
  return NextResponse.json({ success: true, data: rows });
}

const patchSchema = z.object({
  id: z.string(),
  enValue: z.string().optional(),
  frValue: z.string().optional(),
});

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = patchSchema.parse(await req.json());
    const row = await translationService.updateTranslation(body.id, {
      enValue: body.enValue,
      frValue: body.frValue,
    });
    return NextResponse.json({ success: true, data: row });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}
