"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Eye, Plus, RefreshCw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";

type GuideRow = {
  id: string;
  slug: string;
  title: string;
  role: string;
  category: string;
  status: string;
  featured: boolean;
  adminOnly: boolean;
  sortOrder: number;
  videoUrl: string | null;
  steps: unknown[];
};

export function AdminGuidesClient() {
  const [guides, setGuides] = useState<GuideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [analytics, setAnalytics] = useState<{ totals: { views: number; yes: number; no: number }; guides: Array<{ slug: string; title: string; viewCount: number; helpfulYes: number; helpfulNo: number }> } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/guides");
      const data = await res.json();
      setGuides(data.guides ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void (async () => {
      try {
        const res = await fetch("/api/admin/guides/analytics");
        if (res.ok) setAnalytics(await res.json());
      } catch { /* ignore */ }
    })();
  }, [load]);

  const seed = async () => {
    setBusy(true);
    try {
      await fetch("/api/admin/guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/guides/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  };

  const toggleFeatured = async (g: GuideRow) => {
    await fetch(`/api/admin/guides/${g.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: !g.featured }),
    });
    await load();
  };

  const duplicate = async (id: string) => {
    await fetch(`/api/admin/guides/${id}/duplicate`, { method: "POST" });
    await load();
  };

  const createDraft = async () => {
    const title = `New guide ${new Date().toISOString().slice(0, 10)}`;
    const res = await fetch("/api/admin/guides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        summary: "Draft guide",
        role: "ORGANIZER",
        category: "PLATFORM",
        status: "DRAFT",
      }),
    });
    const data = await res.json();
    if (data.guide?.id) window.location.href = `/admin/guides/${data.guide.id}`;
  };

  const filtered = guides.filter((g) => {
    const hay = `${g.title} ${g.slug} ${g.role} ${g.category}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Celeventic Guide"
        subtitle="Create, publish, and feature Learn Celeventic tutorials."
      />

      <div className="flex flex-wrap gap-2 items-center">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter guides…"
          className="max-w-xs"
        />
        <Button type="button" onClick={createDraft}>
          <Plus className="h-4 w-4 mr-1.5" /> New draft
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={seed}>
          <RefreshCw className="h-4 w-4 mr-1.5" /> Seed catalog
        </Button>
      </div>

      {analytics ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 grid sm:grid-cols-3 gap-4 text-sm">
          <div><p className="text-slate-500">Total views</p><p className="text-2xl font-semibold">{analytics.totals.views}</p></div>
          <div><p className="text-slate-500">Helpful yes</p><p className="text-2xl font-semibold">{analytics.totals.yes}</p></div>
          <div><p className="text-slate-500">Not really</p><p className="text-2xl font-semibold">{analytics.totals.no}</p></div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => (
                <tr key={g.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 flex items-center gap-2">
                      {g.featured && <Star className="h-3.5 w-3.5 text-gold-500 fill-gold-500" />}
                      <Link href={`/admin/guides/${g.id}`} className="hover:text-brand-700">
                        {g.title}
                      </Link>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      /guide/{g.slug}
                      {g.adminOnly ? " · admin only" : ""}
                      {g.videoUrl ? " · video" : " · motion"}
                      {` · ${Array.isArray(g.steps) ? g.steps.length : 0} steps`}
                    </p>
                  </td>
                  <td className="px-4 py-3">{g.role}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-md border border-slate-200 px-2 py-1"
                      value={g.status}
                      onChange={(e) => void setStatus(g.id, e.target.value)}
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="PUBLISHED">PUBLISHED</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">{g.sortOrder}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Button type="button" size="sm" variant="ghost" asChild>
                        <Link href={`/guide/${g.slug}`} target="_blank">
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => void toggleFeatured(g)}>
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => void duplicate(g.id)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" size="sm" variant="outline" asChild>
                        <Link href={`/admin/guides/${g.id}`}>Edit</Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
