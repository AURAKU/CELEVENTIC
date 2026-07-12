"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaginationBar } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { ADMIN_TABLE_LIMIT } from "@/lib/pagination";
import { formatCurrency } from "@/lib/utils";

interface QuoteRow {
  id: string;
  status: string;
  title?: string | null;
  currency: string;
  vendor?: { businessName: string; slug: string; profileImage?: string | null };
  versions?: { amount: unknown; depositAmount?: unknown }[];
  lead?: { eventType?: string; eventDate?: string; location?: string };
}

export function OrganizerQuotesClient() {
  const { page, setPage, appendToParams } = usePagination(ADMIN_TABLE_LIMIT);
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/marketplace/quotes?${appendToParams(new URLSearchParams())}`);
    const json = await res.json();
    if (json.success) {
      setQuotes(json.data.items);
      setTotal(json.data.total);
      setPages(json.data.pages ?? Math.ceil(json.data.total / ADMIN_TABLE_LIMIT));
    }
    setLoading(false);
  }, [appendToParams]);

  useEffect(() => {
    void load();
  }, [load]);

  async function acceptQuote(id: string) {
    setActing(id);
    const res = await fetch(`/api/marketplace/quotes/${id}/accept`, { method: "POST" });
    const json = await res.json();
    setActing(null);
    if (res.ok && json.data?.id) {
      window.location.href = `/dashboard/bookings?booking=${json.data.id}`;
      return;
    }
    alert(json.error ?? "Could not accept quote");
    void load();
  }

  async function declineQuote(id: string) {
    setActing(id);
    await fetch(`/api/marketplace/quotes/${id}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setActing(null);
    void load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quote Requests</h1>
        <p className="text-slate-500 text-sm">Review vendor quotes, accept securely, and book with confidence on Celeventic.</p>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading quotes…</p>
      ) : quotes.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-slate-500">No quotes yet. Browse the <Link href="/marketplace" className="text-[#0B8A83] font-medium">Global Event Marketplace</Link> to request services.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => {
            const version = q.versions?.[0];
            const amount = version ? Number(version.amount) : 0;
            return (
              <Card key={q.id}>
                <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{q.vendor?.businessName ?? "Vendor"}</p>
                    <p className="text-sm text-slate-600">{q.title ?? q.lead?.eventType ?? "Service quote"}</p>
                    <p className="text-xs text-slate-500">{q.lead?.location ?? "Global"} · {formatCurrency(amount)} {q.currency}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{q.status}</Badge>
                    {["SENT", "VIEWED", "REVISED"].includes(q.status) && (
                      <>
                        <Button size="sm" disabled={acting === q.id} onClick={() => void acceptQuote(q.id)}>Accept</Button>
                        <Button size="sm" variant="outline" disabled={acting === q.id} onClick={() => void declineQuote(q.id)}>Decline</Button>
                      </>
                    )}
                    {q.vendor?.slug && (
                      <Button size="sm" variant="ghost" asChild><Link href={`/vendors/${q.vendor.slug}`}>Profile</Link></Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <PaginationBar page={page} pages={pages} total={total} limit={ADMIN_TABLE_LIMIT} onPageChange={setPage} />
    </div>
  );
}
