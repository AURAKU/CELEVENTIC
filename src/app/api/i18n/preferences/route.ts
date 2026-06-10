import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { languageService } from "@/services/i18n/language.service";
import { isAppLocale } from "@/lib/i18n/constants";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const languageCode = await languageService.getUserPreference(session.user.id);
  return NextResponse.json({ success: true, data: { languageCode } });
}

const schema = z.object({ languageCode: z.string() });

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = schema.parse(await req.json());
    if (!isAppLocale(body.languageCode)) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    }
    await languageService.setUserPreference(session.user.id, body.languageCode);
    return NextResponse.json({ success: true, data: { languageCode: body.languageCode } });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
