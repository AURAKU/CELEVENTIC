"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";

export default function ContributionsPage() {
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const [stats, setStats] = useState<{ total: number; count: number; recent: { contributor: string; amount: string; message: string | null }[] } | null>(null);
  const [form, setForm] = useState({ contributor: "", amount: "", message: "", isAnonymous: false });
  const [error, setError] = useState("");

  async function loadStats() {
    if (!eventId) return;
    const res = await fetch(`/api/contributions?eventId=${eventId}`);
    const d = await res.json();
    if (res.ok) setStats(d.data);
    else setError(d.error);
  }

  useEffect(() => {
    if (eventId) loadStats();
  }, [eventId]);

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
      loadStats();
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
              {stats.recent.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No contributions yet.</p>
              ) : stats.recent.map((c, i) => (
                <div key={i} className="flex justify-between text-sm py-2 border-b">
                  <span>{c.contributor}</span>
                  <span className="font-medium">{formatCurrency(c.amount)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
