import { NextResponse } from "next/server";
import { translationService } from "@/services/i18n/translation.service";
import { DEFAULT_LOCALE } from "@/lib/i18n/constants";
import { STATIC_MESSAGE_DICTIONARIES } from "@/lib/i18n/static-messages";

export async function GET() {
  try {
    const data = await translationService.getBootstrapPayload();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        languages: [
          { code: "en", name: "English", enabled: true, isDefault: true },
          { code: "fr", name: "French", enabled: true, isDefault: false },
        ],
        messages: STATIC_MESSAGE_DICTIONARIES,
        defaultLocale: DEFAULT_LOCALE,
      },
    });
  }
}
