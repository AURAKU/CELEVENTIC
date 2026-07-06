"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Check, X, Shield } from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { ADMIN_TABLE_LIMIT } from "@/lib/pagination";

interface ReviewRow {
  id: string;
  author: string;
  role: string | null;
  content: string;
  rating: number;
  status: string;
  isVerified: boolean;
  isFeatured: boolean;
}

export function AdminReviewsClient() {
  const { page, setPage, resetPage, appendToParams } = usePagination(ADMIN_TABLE_LIMIT);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    const params = appendToParams(new URLSearchParams());
    if (filter) params.set("status", filter);
    const res = await fetch(`/api/admin/invitation-reviews?${params}`);
    const d = await res.json();
    if (d.success) {
      setReviews(d.data.items ?? []);
      setTotal(d.data.total ?? 0);
      setPages(d.data.pages ?? 1);
    }
  }, [filter, appendToParams]);

  useEffect(() => { resetPage(); }, [filter, resetPage]);
  useEffect(() => { load(); }, [load]);

  async function patch(id: string, data: Record<string, unknown>) {
    await fetch("/api/admin/invitation-reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <AdminToolbar title="Reviews" subtitle="Approve, verify, and feature customer reviews" count={total} onRefresh={load}>
        <Select value={filter || "all"} onValueChange={(v) => setFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </AdminToolbar>

      <div className="grid sm:grid-cols-2 gap-4">
        {reviews.map((r) => (
          <Card key={r.id}>
            <CardContent className="pt-5 space-y-3">
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">{r.author}</p>
                  <p className="text-xs text-slate-500">{r.role}</p>
                </div>
                <div className="flex gap-1">
                  <Badge>{r.status}</Badge>
                  {r.isVerified && <Badge variant="success"><Shield className="h-3 w-3" /></Badge>}
                  {r.isFeatured && <Badge className="bg-[#D4A63A] text-[#0F172A]"><Star className="h-3 w-3" /></Badge>}
                </div>
              </div>
              <p className="text-sm text-slate-600 italic">&ldquo;{r.content}&rdquo;</p>
              <p className="text-xs text-[#D4A63A]">{"★".repeat(r.rating)}</p>
              <div className="flex flex-wrap gap-2">
                {r.status === "PENDING" && (
                  <>
                    <Button size="sm" onClick={() => patch(r.id, { status: "APPROVED" })}><Check className="h-3 w-3" /> Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => patch(r.id, { status: "REJECTED" })}><X className="h-3 w-3" /></Button>
                  </>
                )}
                <Button size="sm" variant="outline" onClick={() => patch(r.id, { isVerified: !r.isVerified })}>
                  {r.isVerified ? "Unverify" : "Verify"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => patch(r.id, { isFeatured: !r.isFeatured })}>
                  {r.isFeatured ? "Unfeature" : "Feature"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <PaginationBar page={page} pages={pages} total={total} limit={ADMIN_TABLE_LIMIT} onPageChange={setPage} />
    </div>
  );
}
