"use client";

import { useEffect, useState, useCallback, type CSSProperties } from "react";
import { useParams } from "next/navigation";
import { PageLoader } from "@/components/ui/page-loader";
import { PublicMemoriesGallery, type MemoryGalleryItem, type MemoryThemeVars } from "@/components/memory/public-memories-gallery";
import { readOrCreateClientGuestKey } from "@/lib/memory/memory-guest-identity";

type MediaFilter = "all" | "image" | "video";

function galleryErrorMessage(status: number, message?: string) {
  if (status === 403) return "This memory gallery is not available right now.";
  if (status === 404) return "Memory gallery not found or link has expired.";
  return message ?? "Could not load memory gallery.";
}

export default function MemoryTokenGalleryPage() {
  const params = useParams();
  const token = params.token as string;
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    event: { title: string; hostName: string };
    allowDownloads: boolean;
    canModerate?: boolean;
    viewToken?: string;
    theme?: { cssVars?: CSSProperties };
    memories: { items: MemoryGalleryItem[]; page: number; pages: number; total: number };
  } | null>(null);

  const handleFilterChange = useCallback((next: MediaFilter) => {
    setFilter(next);
    setPage(1);
  }, []);

  const loadGallery = useCallback(async () => {
    setLoading(true);
    setError(null);
    const guestKey = readOrCreateClientGuestKey();
    const mediaParam = filter === "all" ? "" : `&mediaType=${filter}`;
    const res = await fetch(
      `/api/public/memories/${token}?page=${page}&limit=21${mediaParam}&guestKey=${encodeURIComponent(guestKey)}`
    );
    const d = await res.json();
    if (d.success) {
      setData(d.data);
    } else {
      setData(null);
      setError(galleryErrorMessage(res.status, d.error));
    }
    setLoading(false);
  }, [token, page, filter]);

  useEffect(() => {
    void loadGallery();
  }, [loadGallery]);

  if (loading && !data) return <PageLoader />;
  if (!data) {
    return <p className="text-center py-20 text-slate-500">{error ?? "Memory gallery not found."}</p>;
  }

  return (
    <PublicMemoriesGallery
      eventTitle={data.event.title}
      hostName={data.event.hostName}
      items={data.memories.items}
      page={data.memories.page}
      pages={data.memories.pages}
      total={data.memories.total}
      allowDownloads={data.allowDownloads}
      onPageChange={setPage}
      onFilterChange={handleFilterChange}
      activeFilter={filter}
      loading={loading}
      themeVars={data.theme?.cssVars as MemoryThemeVars | undefined}
      viewToken={data.viewToken ?? token}
      canModerate={Boolean(data.canModerate)}
    />
  );
}
