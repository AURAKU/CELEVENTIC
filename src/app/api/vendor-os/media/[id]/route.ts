import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { vendorProfileService } from "@/services/vendor-os/vendor-profile.service";
import { vendorMediaService } from "@/services/vendor-os/vendor-media.service";

/**
 * Removes one portfolio media item (image or video) — powers the Remove button in the vendor
 * portal's Portfolio grid. Soft-deletes (status -> "removed") rather than hard-deleting the
 * row/file: matches `VendorMediaService.deleteMedia`'s existing contract (keeps usage/plan
 * accounting and audit history intact) and is scoped to `vendorId` so a vendor can only ever
 * remove their own media.
 */
export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendor = await vendorProfileService.getByUserId(session.user.id);
  if (!vendor) return NextResponse.json({ error: "Vendor profile required" }, { status: 403 });

  const { id } = await context.params;
  const result = await vendorMediaService.deleteMedia(vendor.id, id);
  if (result.count === 0) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: { id, deleted: true } });
}
