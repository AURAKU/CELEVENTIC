import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, isAdminRole } from "@/lib/auth";
import { translationService } from "@/services/i18n/translation.service";
import { parsePaginationFromUrl, ADMIN_TABLE_LIMIT } from "@/lib/pagination";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const namespace = searchParams.get("namespace") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const { page, limit } = parsePaginationFromUrl(req.url, { limit: ADMIN_TABLE_LIMIT });
  await translationService.seedTranslations();
  const result = await translationService.listForAdmin(namespace, page, limit, search);
  return NextResponse.json({ success: true, data: result });
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
