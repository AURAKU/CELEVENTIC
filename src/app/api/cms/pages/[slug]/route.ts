import { NextResponse } from "next/server";
import { getCmsPage, isCmsPageSlug } from "@/lib/cms-pages";
import { isAppLocale } from "@/lib/i18n/constants";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  if (!isCmsPageSlug(slug)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const localeParam = searchParams.get("locale") ?? "en";
  const locale = isAppLocale(localeParam) ? localeParam : "en";
  const page = await getCmsPage(slug, locale);
  return NextResponse.json({ success: true, data: page });
}
