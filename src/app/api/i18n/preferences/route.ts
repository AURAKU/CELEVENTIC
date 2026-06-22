import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { languageService } from "@/services/i18n/language.service";
import { isAppLocale } from "@/lib/i18n/constants";
import { LOCALE_COOKIE_MAX_AGE, LOCALE_COOKIE_NAME } from "@/lib/i18n/locale-cookie";

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
    const res = NextResponse.json({ success: true, data: { languageCode: body.languageCode } });
    res.cookies.set(LOCALE_COOKIE_NAME, body.languageCode, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
