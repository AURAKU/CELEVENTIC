"use client";

import Link from "next/link";
import { Heart, MapPin, Share2, Star } from "lucide-react";
import { UploadedMedia } from "@/components/media/uploaded-media";
import { VerifiedBadge, FeaturedBadge } from "@/components/vendor-os/verified-badge";
import type { VendorCardData } from "@/components/vendor-os/vendor-card";
import { resolveMediaUrl } from "@/lib/uploads/media-url";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const HEIGHTS = ["min-h-[18rem]", "min-h-[22rem]", "min-h-[16.5rem]", "min-h-[24rem]", "min-h-[20rem]"] as const;

interface SocialVendorPostProps {
  vendor: VendorCardData;
  index: number;
  saved: boolean;
  copied: boolean;
  saveLabel: string;
  unsaveLabel: string;
  shareLabel: string;
  copiedLabel: string;
  viewLabel: string;
  fromLabel: string;
  unverifiedLabel?: string;
  noReviewsLabel?: string;
  onSave: (vendorId: string) => void;
  onShare: (vendor: VendorCardData) => void;
}

export function SocialVendorPost({
  vendor,
  index,
  saved,
  copied,
  saveLabel,
  unsaveLabel,
  shareLabel,
  copiedLabel,
  viewLabel,
  fromLabel,
  unverifiedLabel = "Unverified",
  noReviewsLabel = "No reviews yet",
  onSave,
  onShare,
}: SocialVendorPostProps) {
  const priceFrom = vendor.rateCards?.[0]?.priceMin ?? vendor.services?.[0]?.priceFrom;
  const location = [vendor.city, vendor.region].filter(Boolean).join(", ");
  const coverUrl = resolveMediaUrl(vendor.coverImage) ?? resolveMediaUrl(vendor.profileImage);
  const height = HEIGHTS[index % HEIGHTS.length];

  return (
    <article className="mb-4 break-inside-avoid">
      <div className="group overflow-hidden rounded-[1.4rem] border border-white/10 bg-slate-900/70 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
        <Link
          href={`/vendors/${vendor.slug}`}
          className={cn("relative block overflow-hidden", height)}
        >
          {coverUrl ? (
            <UploadedMedia
              src={coverUrl}
              alt=""
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-slate-900 to-gold-600/40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

          {vendor.profileImage && (
            <UploadedMedia
              src={vendor.profileImage}
              alt=""
              width={44}
              height={44}
              className="absolute left-3 top-3 h-11 w-11 rounded-full border-2 border-white/80 object-cover shadow-lg"
            />
          )}

          <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
            {vendor.isVerified ? (
              <VerifiedBadge tone="dark" />
            ) : (
              <span className="rounded-full border border-white/20 bg-slate-950/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/70">
                {unverifiedLabel}
              </span>
            )}
            {vendor.isFeatured && <FeaturedBadge />}
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-brand-200">
              {vendor.category}
            </p>
            <h3 className="mt-1 font-display text-lg font-bold leading-tight">{vendor.businessName}</h3>
            {location && (
              <p className="mt-1 flex items-center gap-1 text-sm text-white/75">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {location}
              </p>
            )}
            <div className="mt-2 flex items-center justify-between gap-2">
              {(vendor.reviewCount ?? 0) > 0 ? (
                <span className="inline-flex items-center gap-1 text-sm font-medium">
                  <Star className="h-3.5 w-3.5 fill-gold-400 text-gold-400" />
                  {Number(vendor.rating).toFixed(1)}
                  <span className="text-white/65">({vendor.reviewCount})</span>
                </span>
              ) : (
                <span className="text-sm text-white/60">{noReviewsLabel}</span>
              )}
              {priceFrom !== undefined && (
                <span className="text-sm font-semibold text-brand-200">
                  {fromLabel} {formatCurrency(Number(priceFrom))}
                </span>
              )}
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-1 border-t border-white/10 px-2 py-1.5">
          <button
            type="button"
            onClick={() => onSave(vendor.id)}
            aria-pressed={saved}
            aria-label={saved ? unsaveLabel : saveLabel}
            className="inline-flex min-h-11 min-w-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white touch-manipulation"
          >
            <Heart
              className={cn("h-5 w-5", saved && "fill-accent-500 text-accent-500")}
            />
            {saved ? unsaveLabel : saveLabel}
          </button>
          <button
            type="button"
            onClick={() => onShare(vendor)}
            aria-label={shareLabel}
            className="inline-flex min-h-11 min-w-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white touch-manipulation"
          >
            <Share2 className="h-5 w-5" />
            {copied ? copiedLabel : shareLabel}
          </button>
          <Link
            href={`/vendors/${vendor.slug}`}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl text-sm font-semibold text-brand-200 hover:bg-white/10 hover:text-white touch-manipulation"
          >
            {viewLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
