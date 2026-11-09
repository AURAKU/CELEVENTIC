/** Fields that must never appear on public vendor directory or profile payloads. */
export const PRIVATE_VENDOR_FIELDS = [
  "email",
  "phone",
  "whatsapp",
  "address",
  "ownerName",
  "userId",
] as const;

export type PublicVendorCard = {
  id: string;
  slug: string;
  businessName: string;
  vendorType: string | null;
  category: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  bio: string | null;
  yearsExperience: number | null;
  profileImage: string | null;
  coverImage: string | null;
  rating: number | null;
  reviewCount: number;
  isVerified: boolean;
  isFeatured: boolean;
  isActive: boolean;
};

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === "object" && "toNumber" in value && typeof (value as { toNumber: () => number }).toNumber === "function") {
    const parsed = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function toPublicVendorCard(vendor: Record<string, unknown>): PublicVendorCard {
  const counted = vendor._count as { reviews?: number } | undefined;
  return {
    id: String(vendor.id ?? ""),
    slug: String(vendor.slug ?? ""),
    businessName: String(vendor.businessName ?? ""),
    vendorType: (vendor.vendorType as string | null) ?? null,
    category: (vendor.category as string | null) ?? null,
    city: (vendor.city as string | null) ?? null,
    region: (vendor.region as string | null) ?? null,
    country: (vendor.country as string | null) ?? null,
    bio: (vendor.bio as string | null) ?? null,
    yearsExperience: typeof vendor.yearsExperience === "number" ? vendor.yearsExperience : null,
    profileImage: (vendor.profileImage as string | null) ?? null,
    coverImage: (vendor.coverImage as string | null) ?? null,
    rating: asFiniteNumber(vendor.rating),
    reviewCount: asFiniteNumber(vendor.reviewCount) ?? asFiniteNumber(counted?.reviews) ?? 0,
    isVerified: Boolean(vendor.isVerified),
    isFeatured: Boolean(vendor.isFeatured),
    isActive: vendor.isActive !== false,
  };
}

export function assertNoPrivateVendorFields(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  return PRIVATE_VENDOR_FIELDS.filter((field) => field in record && record[field] != null && record[field] !== "");
}
