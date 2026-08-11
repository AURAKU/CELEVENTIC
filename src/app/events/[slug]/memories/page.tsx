"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useParams } from "next/navigation";
import { PageLoader } from "@/components/ui/page-loader";
import { PublicMemoriesGallery, type MemoryGalleryItem } from "@/components/memory/public-memories-gallery";
import { readOrCreateClientGuestKey } from "@/lib/memory/memory-guest-identity";

type MediaFilter = "all" | "image" | "video";

export default function EventMemoriesBySlugPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MediaFilter>("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    event: { title: string; hostName: string };
    allowDownloads: boolean;
    canModerate?: boolean;
    viewToken?: string;
    theme?: { cssVars?: CSSProperties };
    memories: { items: MemoryGalleryItem[]; page: number; pages: number; total: number };
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    const guestKey = readOrCreateClientGuestKey();
    const mediaParam = filter === "all" ? "" : `&mediaType=${filter}`;
    fetch(
      `/api/public/events/${slug}/memories?page=${page}&limit=21${mediaParam}&guestKey=${encodeURIComponent(guestKey)}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
        setLoading(false);
      });
  }, [slug, page, filter]);

  if (loading && !data) return <PageLoader />;
  if (!data) return <p className="text-center py-20 text-slate-500">Memory gallery not found.</p>;

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
      onFilterChange={(next) => {
        setFilter(next);
        setPage(1);
      }}
      activeFilter={filter}
      loading={loading}
      themeVars={data.theme?.cssVars}
      viewToken={data.viewToken}
      canModerate={Boolean(data.canModerate)}
    />
  );
}
