import { NextResponse } from "next/server";
import { translationService } from "@/services/i18n/translation.service";

export async function GET() {
  const data = await translationService.getBootstrapPayload();
  return NextResponse.json({ success: true, data });
}
