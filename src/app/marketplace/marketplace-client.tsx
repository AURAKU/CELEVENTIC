"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VendorCard, type VendorCardData } from "@/components/vendor-os/vendor-card";
import { Search, Store } from "lucide-react";
import Link from "next/link";

interface Category { slug: string; name: string }

export function MarketplaceClient() {
  const [vendors, setVendors] = useState<VendorCardData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [verified, setVerified] = useState(false);
  const [sort, setSort] = useState("recommended");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (city) params.set("city", city);
    if (verified) params.set("verified", "true");
    params.set("sort", sort);
    fetch(`/api/vendor-os/directory?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setVendors(d.data.vendors);
          setCategories(d.data.categories ?? []);
        }
        setLoading(false);
      });
  }, [search, category, city, verified, sort]);

  return (
    <div className="min-h-screen bg-[#FAF8F4]">
      <div className="bg-gradient-to-br from-[#0F172A] via-[#1a3a38] to-[#0B8A83] text-white py-16 px-4">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm">
            <Store className="h-4 w-4 text-[#D4A63A]" /> Celeventic VendorOS
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold">Discover Trusted Event Vendors</h1>
          <p className="text-white/70 max-w-xl mx-auto">Photographers, caterers, DJs, venues, and more — Ghana-first, globally ready.</p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto mt-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-10 bg-white text-[#0F172A] border-0 h-12"
                placeholder="Search vendors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Input className="bg-white/90 text-[#0F172A] border-0 h-12 sm:w-40" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap gap-2 items-center">
          <Button size="sm" variant={!category ? "default" : "outline"} onClick={() => setCategory("")}>All</Button>
          {categories.map((c) => (
            <Button key={c.slug} size="sm" variant={category === c.name ? "default" : "outline"} onClick={() => setCategory(c.name)}>
              {c.name}
            </Button>
          ))}
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant={verified ? "default" : "outline"} onClick={() => setVerified(!verified)}>Verified</Button>
            <select className="text-sm border rounded-lg px-2 py-1" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recommended">Recommended</option>
              <option value="rating">Top Rated</option>
              <option value="newest">Newest</option>
              <option value="featured">Featured</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-slate-500 py-20">Loading vendors...</p>
        ) : vendors.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-slate-500">No vendors found. Be the first to join!</p>
            <Button asChild><Link href="/dashboard/vendor-portal/signup">List Your Business Free</Link></Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {vendors.map((v) => <VendorCard key={v.id} vendor={v} />)}
          </div>
        )}

        <div className="text-center pt-8 border-t">
          <p className="text-sm text-slate-500 mb-3">Are you an event vendor or venue?</p>
          <Button asChild variant="outline"><Link href="/dashboard/vendor-portal/signup">Join Celeventic VendorOS — Free</Link></Button>
        </div>
      </div>
    </div>
  );
}
