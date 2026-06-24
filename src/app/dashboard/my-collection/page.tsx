"use client";

import { useEffect, useState } from "react";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Heart } from "lucide-react";
import { VendorCard, type VendorCardData } from "@/components/vendor-os/vendor-card";

export default function MyCollectionPage() {
  const [favorites, setFavorites] = useState<{ vendor: VendorCardData }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/vendor-os/favorites")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setFavorites(d.data);
        else setError(d.error ?? "Failed to load collection");
      })
      .catch(() => setError("Failed to load collection"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardPageShell
      title="Saved Vendors"
      description="Your shortlisted vendors in one place — ready when you need them."
      loading={loading}
      error={error}
      empty={!loading && !error && favorites.length === 0}
      emptyIcon={<Heart className="h-10 w-10 text-red-300" />}
      emptyTitle="No saved vendors yet"
      emptyDescription="Browse the marketplace and tap the heart icon to save vendors here."
      emptyAction={
        <Button asChild>
          <Link href="/marketplace">Browse Marketplace</Link>
        </Button>
      }
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {favorites.map((f) => (
          <VendorCard key={f.vendor.id} vendor={f.vendor} />
        ))}
      </div>
    </DashboardPageShell>
  );
}
