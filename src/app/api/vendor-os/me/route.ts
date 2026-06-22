import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { vendorProfileService } from "@/services/vendor-os/vendor-profile.service";
import { vendorMediaService } from "@/services/vendor-os/vendor-media.service";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await vendorProfileService.getByUserId(session.user.id);
  if (!vendor) return NextResponse.json({ success: true, data: null });

  const usage = await vendorMediaService.getUsage(vendor.id);
  return NextResponse.json({ success: true, data: { vendor, usage } });
}
