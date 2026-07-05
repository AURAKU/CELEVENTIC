"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { PageLoader } from "@/components/ui/page-loader";
import { PublicMemoriesGallery } from "@/components/memory/public-memories-gallery";

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
    memories: { items: unknown[]; page: number; pages: number; total: number };
  } | null>(null);

  const handleFilterChange = useCallback((next: MediaFilter) => {
    setFilter(next);
    setPage(1);
  }, []);

  const loadGallery = useCallback(async () => {
    setLoading(true);
    setError(null);
    const mediaParam = filter === "all" ? "" : `&mediaType=${filter}`;
    const res = await fetch(`/api/public/memories/${token}?page=${page}&limit=21${mediaParam}`);
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
      items={data.memories.items as Parameters<typeof PublicMemoriesGallery>[0]["items"]}
      page={data.memories.page}
      pages={data.memories.pages}
      total={data.memories.total}
      allowDownloads={data.allowDownloads}
      onPageChange={setPage}
      onFilterChange={handleFilterChange}
      activeFilter={filter}
      loading={loading}
    />
  );
}
