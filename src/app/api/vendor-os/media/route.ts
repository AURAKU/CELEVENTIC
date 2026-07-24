import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { vendorProfileService } from "@/services/vendor-os/vendor-profile.service";
import { vendorMediaService } from "@/services/vendor-os/vendor-media.service";

/** Lists the signed-in vendor's own active portfolio media (images + videos) for the management grid. */
export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await vendorProfileService.getByUserId(session.user.id);
  if (!vendor) return NextResponse.json({ error: "Vendor profile required" }, { status: 403 });

  const media = await vendorMediaService.listActiveMedia(vendor.id);
  return NextResponse.json({ success: true, data: media });
}
