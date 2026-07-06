"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { ADMIN_TABLE_LIMIT } from "@/lib/pagination";
import { VerifiedBadge } from "@/components/vendor-os/verified-badge";

interface VendorRow {
  id: string;
  businessName: string;
  slug: string;
  category: string;
  city?: string | null;
  isVerified: boolean;
  isFeatured: boolean;
  status: string;
  verificationStatus: string;
  plan?: { name: string };
  user: { name: string; email?: string | null };
  _count: { leads: number; reviews: number; media: number };
}

interface Stats {
  total: number;
  verified: number;
  featured: number;
  pendingVerification: number;
  newLeads: number;
}

export function AdminVendorsClient() {
  const { page, setPage, resetPage, appendToParams } = usePagination(ADMIN_TABLE_LIMIT);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const params = appendToParams(new URLSearchParams());
    if (search) params.set("search", search);
    const res = await fetch(`/api/admin/vendor-os/vendors?${params}`);
    const d = await res.json();
    if (d.success) {
      setVendors(d.data.vendors.items ?? []);
      setTotal(d.data.vendors.total ?? 0);
      setPages(d.data.vendors.pages ?? 1);
      setStats(d.data.stats);
    }
  }, [search, appendToParams]);

  useEffect(() => { resetPage(); }, [search, resetPage]);
  useEffect(() => { load(); }, [load]);

  async function action(vendorId: string, act: string) {
    await fetch("/api/admin/vendor-os/vendors", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId, action: act }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <AdminToolbar title="Vendor Command Center" subtitle="Approve, verify, feature, and moderate VendorOS profiles" count={total} onRefresh={load} />

      {stats && (
        <div className="grid sm:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total },
            { label: "Verified", value: stats.verified },
            { label: "Featured", value: stats.featured },
            { label: "Pending Verify", value: stats.pendingVerification },
            { label: "New Leads", value: stats.newLeads },
          ].map((s) => (
            <Card key={s.label}><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-slate-500">{s.label}</p></CardContent></Card>
          ))}
        </div>
      )}

      <Input placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      <div className="space-y-2">
        {vendors.map((v) => (
          <Card key={v.id}>
            <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold">{v.businessName}</p>
                  {v.isVerified && <VerifiedBadge />}
                  {v.isFeatured && <Badge className="bg-[#D4A63A] text-[#0F172A]">Featured</Badge>}
                  <Badge variant="outline">{v.status}</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">{v.category} · {v.city ?? "—"} · {v.plan?.name ?? "Free"} · {v._count.leads} leads</p>
                <p className="text-xs text-slate-400">{v.user.name} · /vendors/{v.slug}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="outline" onClick={() => action(v.id, "verify")}>Verify</Button>
                <Button size="sm" variant="outline" onClick={() => action(v.id, "feature")}>Feature</Button>
                <Button size="sm" variant="outline" onClick={() => action(v.id, "suspend")}>Suspend</Button>
                <Button size="sm" variant="ghost" asChild><a href={`/vendors/${v.slug}`} target="_blank" rel="noopener noreferrer">View</a></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <PaginationBar page={page} pages={pages} total={total} limit={ADMIN_TABLE_LIMIT} onPageChange={setPage} />
    </div>
  );
}
