import { NextResponse } from "next/server";
import { seatingService } from "@/services/seating/seating.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const result = await seatingService.lookupByGuestToken(token);
  if (!result) return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: result });
}
