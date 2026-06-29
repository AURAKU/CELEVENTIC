"use client";

import Link from "next/link";
import { Star, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { VerifiedBadge, FeaturedBadge } from "@/components/vendor-os/verified-badge";
import { UploadedMedia } from "@/components/media/uploaded-media";
import { resolveMediaUrl } from "@/lib/uploads/media-url";
import { formatCurrency } from "@/lib/utils";

export interface VendorCardData {
  id: string;
  slug: string;
  businessName: string;
  category: string;
  city?: string | null;
  region?: string | null;
  profileImage?: string | null;
  coverImage?: string | null;
  rating: number | string;
  isVerified: boolean;
  isFeatured: boolean;
  rateCards?: { priceMin: number | string; priceMax?: number | string | null; serviceName: string }[];
  services?: { priceFrom: number | string; name: string }[];
}

export function VendorCard({ vendor }: { vendor: VendorCardData }) {
  const priceFrom = vendor.rateCards?.[0]?.priceMin ?? vendor.services?.[0]?.priceFrom;
  const location = [vendor.city, vendor.region].filter(Boolean).join(", ");
  const coverUrl = resolveMediaUrl(vendor.coverImage);

  return (
    <Link href={`/vendors/${vendor.slug}`}>
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-slate-200/80 h-full">
        <div
          className="h-32 bg-gradient-to-br from-[#0B8A83]/20 to-[#0F172A]/10 relative"
          style={coverUrl ? { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        >
          {vendor.profileImage && (
            <UploadedMedia
              src={vendor.profileImage}
              alt=""
              className="absolute -bottom-6 left-4 w-14 h-14 rounded-xl border-2 border-white shadow-md object-cover"
              width={56}
              height={56}
            />
          )}
        </div>
        <CardContent className="pt-8 pb-4 px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-[#0F172A] truncate group-hover:text-[#0B8A83] transition-colors">{vendor.businessName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{vendor.category}</p>
            </div>
            <div className="flex flex-col gap-1 items-end shrink-0">
              {vendor.isVerified && <VerifiedBadge />}
              {vendor.isFeatured && <FeaturedBadge />}
            </div>
          </div>
          {location && (
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><MapPin className="h-3 w-3" />{location}</p>
          )}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-3.5 w-3.5 text-[#D4A63A] fill-[#D4A63A]" />
              <span>{Number(vendor.rating).toFixed(1)}</span>
            </div>
            {priceFrom !== undefined && (
              <p className="text-xs font-medium text-[#0B8A83]">From {formatCurrency(Number(priceFrom))}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
