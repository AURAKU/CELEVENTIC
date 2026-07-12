import { NextResponse } from "next/server";
import { organizerProfileService } from "@/services/workspace/organizer-profile.service";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await organizerProfileService.getBySlug(slug);
  if (!profile) {
    return NextResponse.json({ error: "Organizer not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: profile });
}
