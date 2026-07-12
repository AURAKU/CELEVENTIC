"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { ADMIN_TABLE_LIMIT } from "@/lib/pagination";
import { formatCurrency } from "@/lib/utils";

interface HoldRow {
  id: string;
  status: string;
  amount: unknown;
  netVendorAmount: unknown;
  currency: string;
  booking?: {
    id: string;
    serviceName?: string | null;
    vendor?: { businessName: string };
    organizer?: { name: string; email?: string | null };
  };
}

export function AdminMarketplaceEscrowClient() {
  const { page, setPage, appendToParams } = usePagination(ADMIN_TABLE_LIMIT);
  const [holds, setHolds] = useState<HoldRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/marketplace/escrow?${appendToParams(new URLSearchParams())}`);
    const json = await res.json();
    if (json.success) {
      setHolds(json.data.items);
      setTotal(json.data.total);
      setPages(json.data.pages ?? Math.ceil(json.data.total / ADMIN_TABLE_LIMIT));
    }
    setLoading(false);
  }, [appendToParams]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(holdId: string, action: "freeze" | "release") {
    const reason = action === "freeze" ? prompt("Freeze reason:") ?? "Admin freeze" : undefined;
    await fetch("/api/admin/marketplace/escrow", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holdId, action, reason }),
    });
    void load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marketplace Escrow</h1>
        <p className="text-slate-500 text-sm">Monitor held funds, release payouts, and freeze disputed bookings.</p>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading escrow holds…</p>
      ) : holds.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-slate-500">No escrow holds yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {holds.map((h) => (
            <Card key={h.id}>
              <CardContent className="py-4 flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-medium">{h.booking?.vendor?.businessName ?? "Vendor"}</p>
                  <p className="text-sm text-slate-600">{h.booking?.serviceName ?? "Booking"} · {h.booking?.organizer?.name}</p>
                  <p className="text-xs text-slate-500">Held {formatCurrency(Number(h.amount))} · Net {formatCurrency(Number(h.netVendorAmount))} {h.currency}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{h.status}</Badge>
                  {["HELD", "FUNDED", "FROZEN"].includes(h.status) && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => void act(h.id, "release")}>Release</Button>
                      {h.status !== "FROZEN" && (
                        <Button size="sm" variant="destructive" onClick={() => void act(h.id, "freeze")}>Freeze</Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PaginationBar page={page} pages={pages} total={total} limit={ADMIN_TABLE_LIMIT} onPageChange={setPage} />
    </div>
  );
}
