"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { VendorCard, type VendorCardData } from "@/components/vendor-os/vendor-card";

export default function MyCollectionPage() {
  const [favorites, setFavorites] = useState<{ vendor: VendorCardData }[]>([]);

  useEffect(() => {
    fetch("/api/vendor-os/favorites")
      .then((r) => r.json())
      .then((d) => { if (d.success) setFavorites(d.data); });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Heart className="h-6 w-6 text-red-400" /> My Event Collection</h1>
        <p className="page-subtitle">Shortlist vendors before you book. Your saved favorites in one place.</p>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-16 text-slate-500 space-y-3">
          <p>No saved vendors yet.</p>
          <Link href="/marketplace" className="text-[#0B8A83] hover:underline text-sm">Browse the Marketplace →</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {favorites.map((f) => <VendorCard key={f.vendor.id} vendor={f.vendor} />)}
        </div>
      )}
    </div>
  );
}
