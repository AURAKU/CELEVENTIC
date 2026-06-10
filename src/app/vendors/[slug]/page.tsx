import { notFound } from "next/navigation";
import { vendorProfileService } from "@/services/vendor-os/vendor-profile.service";
import { VendorProfileClient } from "./vendor-profile-client";

export default async function VendorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vendor = await vendorProfileService.getBySlug(slug);
  if (!vendor) notFound();

  const profile = {
    ...vendor,
    rating: Number(vendor.rating),
    rateCards: vendor.rateCards?.map((r) => ({
      ...r,
      priceMin: Number(r.priceMin),
      priceMax: r.priceMax ? Number(r.priceMax) : null,
    })),
  };

  return <VendorProfileClient vendor={profile as Parameters<typeof VendorProfileClient>[0]["vendor"]} />;
}
