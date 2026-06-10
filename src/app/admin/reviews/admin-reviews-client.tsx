"use client";

import { useState, useEffect } from "react";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Check, X, Shield } from "lucide-react";

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
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [filter, setFilter] = useState("");

  async function load() {
    const params = filter ? `?status=${filter}` : "";
    const res = await fetch(`/api/admin/invitation-reviews${params}`);
    const d = await res.json();
    if (d.success) setReviews(d.data);
  }

  useEffect(() => { load(); }, [filter]);

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
      <AdminToolbar title="Reviews" subtitle="Approve, verify, and feature customer reviews" count={reviews.length} onRefresh={load}>
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
    </div>
  );
}
