import { NextResponse } from "next/server";
import { getPublicContactSettings } from "@/lib/contact/public-contact";

export async function GET() {
  const data = await getPublicContactSettings();
  return NextResponse.json({ success: true, data });
}
