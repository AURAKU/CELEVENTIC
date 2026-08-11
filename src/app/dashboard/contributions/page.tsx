"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationBar } from "@/components/ui/pagination";
import { Heart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";
import { DEFAULT_LIMIT } from "@/lib/pagination";

type ContributionRow = {
  id: string;
  contributor: string;
  amount: string;
  message: string | null;
  createdAt: string;
};

export default function ContributionsPage() {
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const [stats, setStats] = useState<{ total: number; count: number } | null>(null);
  const [contributions, setContributions] = useState<ContributionRow[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({ contributor: "", amount: "", message: "", isAnonymous: false });
  const [error, setError] = useState("");

  useEffect(() => {
    setPage(1);
  }, [eventId]);

  async function loadStats(currentPage = page) {
    if (!eventId) return;
    const params = new URLSearchParams({
      eventId,
      page: String(currentPage),
      limit: String(DEFAULT_LIMIT),
    });
    const res = await fetch(`/api/contributions?${params}`);
    const d = await res.json();
    if (res.ok) {
      setStats({ total: d.data.total, count: d.data.count });
      const list = d.data.contributions;
      setContributions(list?.items ?? []);
      setTotal(list?.total ?? 0);
      setPages(list?.pages ?? 1);
    } else {
      setError(d.error);
    }
  }

  useEffect(() => {
    if (eventId) void loadStats(page);
  }, [eventId, page]);

  async function contribute(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/contributions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, ...form, amount: parseFloat(form.amount) }),
    });
    const d = await res.json();
    if (res.ok) {
      setForm({ contributor: "", amount: "", message: "", isAnonymous: false });
      setPage(1);
      void loadStats(1);
    } else {
      setError(d.error || "Failed to record contribution");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contribution Engine</h1>
        <p className="page-subtitle">Wedding, funeral, church, and fundraiser contribution wallets.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <EventPicker events={events} value={eventId} onChange={setEventId} loading={eventsLoading} />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {stats && (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5 text-brand-600" /> Record Contribution</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={contribute} className="space-y-3">
                <div className="space-y-1"><Label>Contributor Name</Label><Input value={form.contributor} onChange={(e) => setForm({ ...form, contributor: e.target.value })} required disabled={!eventId} /></div>
                <div className="space-y-1"><Label>Amount (GHS)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required disabled={!eventId} /></div>
                <div className="space-y-1"><Label>Message</Label><Input value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} disabled={!eventId} /></div>
                <Button type="submit" className="w-full" disabled={!eventId}>Record Contribution</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <p className="text-2xl font-bold text-brand-600">{formatCurrency(stats.total)}</p>
              <p className="text-sm text-slate-500">{stats.count} contributions</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {contributions.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No contributions yet.</p>
              ) : (
                contributions.map((c) => (
                  <div key={c.id} className="flex justify-between gap-3 text-sm py-2 border-b">
                    <div className="min-w-0">
                      <span className="font-medium">{c.contributor}</span>
                      {c.message && <p className="text-xs text-slate-500 truncate">{c.message}</p>}
                    </div>
                    <span className="shrink-0 font-medium">{formatCurrency(c.amount)}</span>
                  </div>
                ))
              )}
              <PaginationBar
                page={page}
                pages={pages}
                total={total}
                limit={DEFAULT_LIMIT}
                onPageChange={setPage}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
