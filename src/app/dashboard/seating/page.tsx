"use client";

import { useCallback, useEffect, useState } from "react";
import { Armchair, Plus, Search, Trash2, Save, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EventPicker } from "@/components/dashboard/event-picker";
import { useEventContext } from "@/hooks/use-event-context";
import { PageLoader } from "@/components/ui/page-loader";
import Link from "next/link";

interface GuestRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  qrToken: string;
}

interface AssignmentRow {
  guestId: string;
  tableNumber: string;
  seatLabel?: string;
  zone?: string;
}

export default function SeatingDashboardPage() {
  const { events, eventId, setEventId, loading: eventsLoading } = useEventContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [planName, setPlanName] = useState("Main reception");
  const [assignments, setAssignments] = useState<Record<string, AssignmentRow>>({});
  const [tables, setTables] = useState<{ id: string; label: string; zone?: string }[]>([]);
  const [search, setSearch] = useState("");
  const [newTable, setNewTable] = useState("");

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    const res = await fetch(`/api/events/${eventId}/seating`);
    const d = await res.json();
    if (d.success) {
      setGuests(d.data.guests ?? []);
      if (d.data.plan) {
        setPlanName(d.data.plan.name);
        const layoutTables = (d.data.plan.layout as { tables?: { id: string; label: string; zone?: string }[] })?.tables ?? [];
        setTables(layoutTables);
        const map: Record<string, AssignmentRow> = {};
        for (const a of d.data.plan.assignments ?? []) {
          map[a.guestId] = {
            guestId: a.guestId,
            tableNumber: a.tableNumber,
            seatLabel: a.seatLabel ?? undefined,
            zone: a.zone ?? undefined,
          };
        }
        setAssignments(map);
      } else {
        setTables([]);
      }
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => { void load(); }, [load]);

  async function savePlan() {
    if (!eventId) return;
    setSaving(true);
    const assignmentTables = Object.values(assignments).reduce((acc, a) => {
      if (a.tableNumber && !acc.find((t) => t.label === a.tableNumber)) {
        acc.push({ id: `t-${a.tableNumber}`, label: a.tableNumber, zone: a.zone });
      }
      return acc;
    }, [] as { id: string; label: string; zone?: string }[]);

    const mergedTables = [...tables];
    for (const t of assignmentTables) {
      if (!mergedTables.find((m) => m.label === t.label)) mergedTables.push(t);
    }

    await fetch(`/api/events/${eventId}/seating`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: planName, layout: { tables: mergedTables } }),
    });

    await fetch(`/api/events/${eventId}/seating/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments: Object.values(assignments) }),
    });
    setSaving(false);
    void load();
  }

  function quickAddTable() {
    const label = newTable.trim();
    if (!label) return;
    if (tables.some((t) => t.label.toLowerCase() === label.toLowerCase())) {
      setNewTable("");
      return;
    }
    setTables((prev) => [...prev, { id: `t-${label}`, label }]);
    setNewTable("");
  }

  function assignGuest(guestId: string, tableNumber: string) {
    setAssignments((prev) => ({
      ...prev,
      [guestId]: { guestId, tableNumber, seatLabel: prev[guestId]?.seatLabel, zone: prev[guestId]?.zone },
    }));
  }

  const filtered = guests.filter((g) =>
    !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (eventsLoading) return <PageLoader label="Loading events…" className="min-h-[40vh]" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Armchair className="h-6 w-6 text-[#0B8A83]" /> Seating arrangement
          </h1>
          <p className="page-subtitle">Assign tables — guests scan their QR to see seat details instantly.</p>
        </div>
        <EventPicker events={events} value={eventId} onChange={setEventId} />
      </div>

      {!eventId ? (
        <Card><CardContent className="py-12 text-center text-slate-500">Select an event to manage seating.</CardContent></Card>
      ) : loading ? (
        <PageLoader label="Loading seating…" />
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Plan settings</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1 flex-1 min-w-[200px]">
                <Label>Plan name</Label>
                <Input value={planName} onChange={(e) => setPlanName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Quick add table</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Table 12"
                    value={newTable}
                    onChange={(e) => setNewTable(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), quickAddTable())}
                  />
                  <Button variant="outline" onClick={quickAddTable} disabled={!newTable.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button onClick={() => void savePlan()} disabled={saving} className="bg-[#0B8A83]">
                <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save seating"}
              </Button>
            </CardContent>
          </Card>

          {tables.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Tables ({tables.length})</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {tables.map((t) => (
                  <Badge key={t.id} variant="outline" className="px-3 py-1.5 text-sm">
                    {t.label}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Guest assignments</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input className="pl-9" placeholder="Search guests…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No guests yet — add guests from the Guests page first.</p>
              ) : filtered.map((g) => (
                <div key={g.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl border bg-white">
                  <div className="flex-1 min-w-[140px]">
                    <p className="font-medium text-sm">{g.name}</p>
                    <p className="text-xs text-slate-500">{g.email ?? g.phone ?? "—"}</p>
                  </div>
                  <Input
                    className="w-28"
                    placeholder="Table"
                    value={assignments[g.id]?.tableNumber ?? ""}
                    onChange={(e) => assignGuest(g.id, e.target.value)}
                  />
                  <Input
                    className="w-20"
                    placeholder="Seat"
                    value={assignments[g.id]?.seatLabel ?? ""}
                    onChange={(e) => setAssignments((prev) => ({
                      ...prev,
                      [g.id]: { ...prev[g.id], guestId: g.id, tableNumber: prev[g.id]?.tableNumber ?? "", seatLabel: e.target.value },
                    }))}
                  />
                  <Link href={`/seat/${g.qrToken}`} target="_blank" className="text-xs text-[#0B8A83] flex items-center gap-1 hover:underline">
                    <QrCode className="h-3.5 w-3.5" /> Preview
                  </Link>
                  {assignments[g.id] && (
                    <Button size="icon" variant="ghost" onClick={() => {
                      const next = { ...assignments };
                      delete next[g.id];
                      setAssignments(next);
                    }}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
