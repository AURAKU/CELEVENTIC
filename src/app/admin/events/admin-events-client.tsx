"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminToolbar } from "@/components/admin/admin-toolbar";
import { formatDate } from "@/lib/utils";
import { ExternalLink, Star, Trash2, Eye } from "lucide-react";

interface EventRow {
  id: string;
  slug: string;
  title: string;
  eventType: string;
  status: string;
  isPublic: boolean;
  isFeatured: boolean;
  hostName: string;
  startDate: string;
  organizer: { name: string; email: string | null };
  _count: { guests: number; tickets: number };
}

export function AdminEventsClient() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/events?${params}`);
    const d = await res.json();
    if (d.success) {
      setEvents(d.data.events);
      setTotal(d.data.total);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function updateEvent(id: string, data: Record<string, unknown>) {
    await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    load();
  }

  async function removeEvent(id: string, title: string) {
    if (!confirm(`Cancel or delete event "${title}"?`)) return;
    await fetch(`/api/admin/events?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <AdminToolbar
        title="Events"
        subtitle="Track, feature, publish, or remove all platform events."
        count={total}
        search={search}
        onSearchChange={setSearch}
        onRefresh={load}
      >
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {["DRAFT", "PUBLISHED", "LIVE", "COMPLETED", "CANCELLED"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AdminToolbar>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-slate-500">
                <th className="p-3">Event</th>
                <th className="p-3">Organizer</th>
                <th className="p-3">Type</th>
                <th className="p-3">Status</th>
                <th className="p-3">Guests</th>
                <th className="p-3">Date</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">No events found</td></tr>
              ) : events.map((ev) => (
                <tr key={ev.id} className="border-b last:border-0 hover:bg-slate-50/50">
                  <td className="p-3">
                    <p className="font-medium">{ev.title}</p>
                    <p className="text-xs text-slate-400">{ev.slug}</p>
                  </td>
                  <td className="p-3">
                    <p>{ev.organizer.name}</p>
                    <p className="text-xs text-slate-400">{ev.organizer.email}</p>
                  </td>
                  <td className="p-3"><Badge variant="outline">{ev.eventType.replace(/_/g, " ")}</Badge></td>
                  <td className="p-3">
                    <Select value={ev.status} onValueChange={(v) => updateEvent(ev.id, { status: v })}>
                      <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["DRAFT", "PUBLISHED", "LIVE", "COMPLETED", "CANCELLED"].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3">{ev._count.guests}</td>
                  <td className="p-3 text-slate-500">{formatDate(ev.startDate)}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" title="Feature" onClick={() => updateEvent(ev.id, { isFeatured: !ev.isFeatured })}>
                        <Star className={`h-3.5 w-3.5 ${ev.isFeatured ? "text-gold-500 fill-gold-500" : ""}`} />
                      </Button>
                      <Button size="sm" variant="ghost" title="Public" onClick={() => updateEvent(ev.id, { isPublic: !ev.isPublic })}>
                        <Eye className={`h-3.5 w-3.5 ${ev.isPublic ? "text-brand-600" : ""}`} />
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/events/${ev.slug}`} target="_blank"><ExternalLink className="h-3.5 w-3.5" /></Link>
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeEvent(ev.id, ev.title)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
