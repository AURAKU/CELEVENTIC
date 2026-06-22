"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageLoader } from "@/components/ui/page-loader";
import { PublicMemoriesGallery } from "@/components/memory/public-memories-gallery";

export default function MemoryTokenGalleryPage() {
  const params = useParams();
  const token = params.token as string;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    event: { title: string; hostName: string };
    allowDownloads: boolean;
    memories: { items: unknown[]; page: number; pages: number; total: number };
  } | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/memories/${token}?page=${page}&limit=20`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
        setLoading(false);
      });
  }, [token, page]);

  if (loading && !data) return <PageLoader />;
  if (!data) return <p className="text-center py-20 text-slate-500">Memory gallery not found.</p>;

  return (
    <div className="min-h-screen bg-[#FAF8F4] py-10 px-4">
      <PublicMemoriesGallery
        eventTitle={data.event.title}
        hostName={data.event.hostName}
        items={data.memories.items as Parameters<typeof PublicMemoriesGallery>[0]["items"]}
        page={data.memories.page}
        pages={data.memories.pages}
        total={data.memories.total}
        allowDownloads={data.allowDownloads}
        onPageChange={setPage}
      />
    </div>
  );
}
