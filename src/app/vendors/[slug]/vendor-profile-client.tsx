"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, MapPin, Phone, Mail, MessageCircle, Heart, Globe, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerifiedBadge, FeaturedBadge } from "@/components/vendor-os/verified-badge";
import { RequestQuoteModal } from "@/components/vendor-os/request-quote-modal";
import { formatCurrency } from "@/lib/utils";
import { AgiFooter } from "@/components/agi-engine/agi-badge";

interface VendorProfile {
  id: string;
  slug: string;
  businessName: string;
  category: string;
  bio?: string | null;
  description?: string | null;
  city?: string | null;
  region?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  profileImage?: string | null;
  coverImage?: string | null;
  rating: number | string;
  reviewCount: number;
  isVerified: boolean;
  isFeatured: boolean;
  yearsExperience?: number | null;
  socialLinks?: { platform: string; url: string }[];
  media?: { id: string; type: string; url: string; caption?: string | null }[];
  rateCards?: { serviceName: string; priceMin: number | string; priceMax?: number | string | null; description?: string | null }[];
  reviews?: { rating: number; comment?: string | null; user: { name: string } }[];
  eventReferences?: { eventTitle: string; eventType?: string | null; location?: string | null; eventYear?: number | null }[];
}

export function VendorProfileClient({ vendor }: { vendor: VendorProfile }) {
  const [saved, setSaved] = useState(false);
  const location = [vendor.city, vendor.region].filter(Boolean).join(", ");
  const about = vendor.bio ?? vendor.description;

  async function toggleSave() {
    const res = await fetch("/api/vendor-os/favorites", {
      method: saved ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: saved ? undefined : JSON.stringify({ vendorId: vendor.id }),
    });
    if (res.ok) setSaved(!saved);
  }

  const waUrl = vendor.whatsapp
    ? `https://wa.me/${vendor.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${vendor.businessName}, I found you on Celeventic and would like to enquire about your services.`)}`
    : null;

  return (
    <div className="min-h-screen bg-[#FAF8F4]">
      <div
        className="h-48 sm:h-64 bg-gradient-to-br from-[#0B8A83]/30 to-[#0F172A]/20 relative"
        style={vendor.coverImage ? { backgroundImage: `url(${vendor.coverImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      />

      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-10 pb-16">
        <div className="bg-white rounded-2xl shadow-lg border p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {vendor.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vendor.profileImage} alt="" className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg object-cover -mt-16 sm:-mt-20" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-[#0B8A83]/10 flex items-center justify-center text-3xl font-bold text-[#0B8A83] -mt-16 sm:-mt-20 border-4 border-white shadow-lg">
                {vendor.businessName[0]}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 items-center">
                <h1 className="font-display text-2xl font-bold text-[#0F172A]">{vendor.businessName}</h1>
                {vendor.isVerified && <VerifiedBadge size="md" />}
                {vendor.isFeatured && <FeaturedBadge />}
              </div>
              <p className="text-slate-500 mt-1">{vendor.category}{vendor.yearsExperience ? ` · ${vendor.yearsExperience}+ years` : ""}</p>
              {location && <p className="text-sm text-slate-400 mt-1 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{location}</p>}
              <div className="flex items-center gap-1 mt-2 text-sm">
                <Star className="h-4 w-4 text-[#D4A63A] fill-[#D4A63A]" />
                <span className="font-medium">{Number(vendor.rating).toFixed(1)}</span>
                <span className="text-slate-400">({vendor.reviewCount} reviews)</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            <RequestQuoteModal vendorId={vendor.id} vendorName={vendor.businessName} />
            {waUrl && (
              <Button variant="outline" asChild>
                <a href={waUrl} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
              </Button>
            )}
            {vendor.phone && (
              <Button variant="outline" asChild><a href={`tel:${vendor.phone}`}><Phone className="h-4 w-4" /> Call</a></Button>
            )}
            {vendor.email && (
              <Button variant="outline" asChild><a href={`mailto:${vendor.email}`}><Mail className="h-4 w-4" /> Email</a></Button>
            )}
            <Button variant="ghost" size="sm" onClick={toggleSave}>
              <Heart className={`h-4 w-4 ${saved ? "fill-red-500 text-red-500" : ""}`} /> Save
            </Button>
          </div>
        </div>

        {about && (
          <section className="mt-6 bg-white rounded-2xl border p-6">
            <h2 className="font-display text-lg font-bold mb-3">About</h2>
            <p className="text-slate-600 leading-relaxed whitespace-pre-line">{about}</p>
          </section>
        )}

        {vendor.rateCards && vendor.rateCards.length > 0 && (
          <section className="mt-6 bg-white rounded-2xl border p-6">
            <h2 className="font-display text-lg font-bold mb-4">Rate Card</h2>
            <div className="space-y-3">
              {vendor.rateCards.map((r) => (
                <div key={r.serviceName} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{r.serviceName}</p>
                    {r.description && <p className="text-xs text-slate-500">{r.description}</p>}
                  </div>
                  <p className="font-semibold text-[#0B8A83]">
                    {formatCurrency(Number(r.priceMin))}
                    {r.priceMax ? ` – ${formatCurrency(Number(r.priceMax))}` : "+"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {vendor.media && vendor.media.length > 0 && (
          <section className="mt-6 bg-white rounded-2xl border p-6">
            <h2 className="font-display text-lg font-bold mb-4">Portfolio</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {vendor.media.map((m) => (
                <div key={m.id} className="aspect-square rounded-xl overflow-hidden bg-slate-100">
                  {m.type === "video" ? (
                    <video src={m.url} className="w-full h-full object-cover" controls preload="none" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt={m.caption ?? ""} className="w-full h-full object-cover" loading="lazy" />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {vendor.socialLinks && vendor.socialLinks.length > 0 && (
          <section className="mt-6 bg-white rounded-2xl border p-6">
            <h2 className="font-display text-lg font-bold mb-3">Connect</h2>
            <div className="flex flex-wrap gap-2">
              {vendor.socialLinks.map((s) => (
                <Button key={s.platform} variant="outline" size="sm" asChild>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-3.5 w-3.5" /> {s.platform}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              ))}
            </div>
          </section>
        )}

        {vendor.reviews && vendor.reviews.length > 0 && (
          <section className="mt-6 bg-white rounded-2xl border p-6">
            <h2 className="font-display text-lg font-bold mb-4">Reviews</h2>
            <div className="space-y-4">
              {vendor.reviews.map((r, i) => (
                <div key={i} className="border-b pb-4 last:border-0">
                  <div className="flex items-center gap-2">
                    <Star className="h-3.5 w-3.5 text-[#D4A63A] fill-[#D4A63A]" />
                    <span className="text-sm font-medium">{r.rating}/5</span>
                    <span className="text-xs text-slate-400">— {r.user.name}</span>
                  </div>
                  {r.comment && <p className="text-sm text-slate-600 mt-1">{r.comment}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-8 text-center space-y-2">
          <Link href="/marketplace" className="text-sm text-[#0B8A83] hover:underline">← Back to Marketplace</Link>
          <AgiFooter />
        </div>
      </div>
    </div>
  );
}
