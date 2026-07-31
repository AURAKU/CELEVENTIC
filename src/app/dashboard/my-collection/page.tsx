"use client";

import { useEffect, useState } from "react";
import { DashboardPageShell } from "@/components/dashboard/dashboard-page-shell";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Heart } from "lucide-react";
import { VendorCard, type VendorCardData } from "@/components/vendor-os/vendor-card";
import { PaginationBar } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { PUBLIC_GRID_LIMIT } from "@/lib/pagination";

export default function MyCollectionPage() {
  const { page, setPage, appendToParams } = usePagination(PUBLIC_GRID_LIMIT);
  const [favorites, setFavorites] = useState<{ vendor: VendorCardData }[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = appendToParams(new URLSearchParams());
    fetch(`/api/vendor-os/favorites?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) {
          setError(d.error ?? "Failed to load collection");
          return;
        }
        const data = d.data;
        if (Array.isArray(data)) {
          setFavorites(data);
          setTotal(data.length);
          setPages(1);
        } else {
          setFavorites(data.items ?? []);
          setTotal(data.total ?? 0);
          setPages(data.pages ?? 1);
        }
      })
      .catch(() => setError("Failed to load collection"))
      .finally(() => setLoading(false));
  }, [appendToParams]);

  return (
    <DashboardPageShell
      title="Saved Vendors"
      description="Your shortlisted vendors in one place, ready when you need them."
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
      <PaginationBar page={page} pages={pages} total={total} limit={PUBLIC_GRID_LIMIT} onPageChange={setPage} />
    </DashboardPageShell>
  );
}
