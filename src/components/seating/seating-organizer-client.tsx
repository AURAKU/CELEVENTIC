"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Armchair,
  Circle,
  Square,
  RectangleHorizontal,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Users,
  CheckCircle2,
  QrCode,
  LayoutGrid,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageLoader } from "@/components/ui/page-loader";
import { SeatingFloorPlan } from "@/components/seating/seating-floor-plan";
import { SeatAssignPanel } from "@/components/seating/seating-table-visual";
import {
  defaultSeatCount,
  generateTablesForGuests,
  normalizeTable,
  type GuestAssignmentView,
  type SeatingLayoutConfig,
  type SeatingTableConfig,
  type TableShape,
} from "@/lib/seating/seating-types";

interface GuestRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  qrToken: string;
  status?: string;
}

interface AssignmentRow {
  guestId: string;
  tableNumber: string;
  seatLabel?: string;
  zone?: string;
  notes?: string;
}

interface SeatingOrganizerClientProps {
  eventId: string;
}

const SHAPE_OPTIONS: { id: TableShape; label: string; icon: typeof Circle }[] = [
  { id: "round", label: "Round", icon: Circle },
  { id: "square", label: "Square", icon: Square },
  { id: "rectangle", label: "Rectangle", icon: RectangleHorizontal },
];

export function SeatingOrganizerClient({ eventId }: SeatingOrganizerClientProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [guestsTruncated, setGuestsTruncated] = useState(false);
  const [guestTotal, setGuestTotal] = useState(0);
  const [planName, setPlanName] = useState("Main reception");
  const [tables, setTables] = useState<SeatingTableConfig[]>([]);
  const [assignments, setAssignments] = useState<Record<string, AssignmentRow>>({});
  const [expectedGuests, setExpectedGuests] = useState(0);
  const [view, setView] = useState<"floor" | "list">("floor");

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [assignPanelOpen, setAssignPanelOpen] = useState(false);

  const [newTableLabel, setNewTableLabel] = useState("");
  const [newTableShape, setNewTableShape] = useState<TableShape>("round");
  const [newTableSeats, setNewTableSeats] = useState(8);
  const [newTableZone, setNewTableZone] = useState("");

  const [genShape, setGenShape] = useState<TableShape>("round");
  const [genSeatsPerTable, setGenSeatsPerTable] = useState(8);
  const [genGuestCount, setGenGuestCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const res = await fetch(`/api/events/${eventId}/seating`);
    const d = await res.json();
    if (!res.ok || !d.success) {
      setLoadError(d.error ?? "Could not load seating plan");
      setLoading(false);
      return;
    }
    if (d.success) {
      const guestList: GuestRow[] = d.data.guests ?? [];
      setGuests(guestList);
      setGenGuestCount(guestList.length);
      setGuestsTruncated(Boolean(d.data.guestsTruncated));
      setGuestTotal(Number(d.data.guestTotal ?? guestList.length));

      if (d.data.plan) {
        setPlanName(d.data.plan.name);
        const layout = d.data.plan.layout as SeatingLayoutConfig;
        const rawTables = layout?.tables ?? [];
        setTables(rawTables.map((t) => normalizeTable(t)));
        setExpectedGuests(layout?.expectedGuests ?? guestList.length);

        const map: Record<string, AssignmentRow> = {};
        for (const a of d.data.plan.assignments ?? []) {
          map[a.guestId] = {
            guestId: a.guestId,
            tableNumber: a.tableNumber,
            seatLabel: a.seatLabel ?? undefined,
            zone: a.zone ?? undefined,
            notes: a.notes ?? undefined,
          };
        }
        setAssignments(map);
      } else {
        setTables([]);
        setExpectedGuests(guestList.length);
      }
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const assignmentViews: GuestAssignmentView[] = useMemo(() => {
    return Object.values(assignments).map((a) => {
      const guest = guests.find((g) => g.id === a.guestId);
      return {
        guestId: a.guestId,
        guestName: guest?.name ?? "Guest",
        guestEmail: guest?.email,
        guestStatus: guest?.status,
        tableNumber: a.tableNumber,
        seatLabel: a.seatLabel,
        zone: a.zone,
        notes: a.notes,
        admitted: guest?.status === "CHECKED_IN",
      };
    });
  }, [assignments, guests]);

  const stats = useMemo(() => {
    const assigned = Object.keys(assignments).length;
    const admitted = assignmentViews.filter((a) => a.admitted).length;
    const totalSeats = tables.reduce((sum, t) => sum + (normalizeTable(t).seatCount ?? 8), 0);
    return { assigned, admitted, unassigned: guests.length - assigned, totalSeats, tableCount: tables.length };
  }, [assignments, assignmentViews, guests.length, tables]);

  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null;

  async function savePlan() {
    setSaving(true);
    setSaveError(null);
    const layout: SeatingLayoutConfig = {
      tables: tables.map((t) => normalizeTable(t)),
      expectedGuests,
    };

    try {
      const planRes = await fetch(`/api/events/${eventId}/seating`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: planName, layout }),
      });
      const planData = await planRes.json();
      if (!planRes.ok || !planData.success) {
        setSaveError(planData.error ?? "Failed to save seating plan");
        return;
      }

      const assignRes = await fetch(`/api/events/${eventId}/seating/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: Object.values(assignments) }),
      });
      const assignData = await assignRes.json();
      if (!assignRes.ok || !assignData.success) {
        setSaveError(assignData.error ?? "Failed to save seat assignments");
        return;
      }

      void load();
    } finally {
      setSaving(false);
    }
  }

  function addTable() {
    const label = newTableLabel.trim();
    if (!label) return;
    if (tables.some((t) => t.label.toLowerCase() === label.toLowerCase())) return;

    setTables((prev) => [
      ...prev,
      normalizeTable({
        id: `t-${Date.now()}`,
        label,
        shape: newTableShape,
        seatCount: newTableSeats,
        capacity: newTableSeats,
        zone: newTableZone || undefined,
      }),
    ]);
    setNewTableLabel("");
    setNewTableZone("");
  }

  function autoGenerateTables() {
    const count = genGuestCount || guests.length || expectedGuests || 8;
    const generated = generateTablesForGuests(count, genSeatsPerTable, genShape);
    setTables(generated.map((t) => normalizeTable(t)));
    setExpectedGuests(count);
  }

  function updateTable(id: string, patch: Partial<SeatingTableConfig>) {
    setTables((prev) =>
      prev.map((t) => (t.id === id ? normalizeTable({ ...t, ...patch }) : t))
    );
  }

  function removeTable(id: string) {
    const table = tables.find((t) => t.id === id);
    if (!table) return;
    setTables((prev) => prev.filter((t) => t.id !== id));
    setAssignments((prev) => {
      const next = { ...prev };
      for (const [guestId, a] of Object.entries(next)) {
        if (a.tableNumber.toLowerCase() === table.label.toLowerCase()) delete next[guestId];
      }
      return next;
    });
    if (selectedTableId === id) {
      setSelectedTableId(null);
      setSelectedSeat(null);
      setAssignPanelOpen(false);
    }
  }

  function handleSeatSelect(tableId: string, seatIndex: number) {
    setSelectedTableId(tableId);
    setSelectedSeat(seatIndex);
    setAssignPanelOpen(true);
  }

  function assignGuestToSeat(guestId: string) {
    const table = tables.find((t) => t.id === selectedTableId);
    if (!table || selectedSeat === null) return;

    setAssignments((prev) => {
      const next = { ...prev };
      for (const [id, a] of Object.entries(next)) {
        if (
          a.tableNumber.toLowerCase() === table.label.toLowerCase() &&
          a.seatLabel === String(selectedSeat)
        ) {
          delete next[id];
        }
      }
      next[guestId] = {
        guestId,
        tableNumber: table.label,
        seatLabel: String(selectedSeat),
        zone: table.zone,
      };
      return next;
    });
    setAssignPanelOpen(false);
  }

  async function unassignSeat() {
    const table = tables.find((t) => t.id === selectedTableId);
    if (!table || selectedSeat === null) return;
    const existing = Object.entries(assignments).find(
      ([, a]) =>
        a.tableNumber.toLowerCase() === table.label.toLowerCase() &&
        a.seatLabel === String(selectedSeat)
    );
    if (existing) {
      const next = { ...assignments };
      delete next[existing[0]];
      setAssignments(next);
      await fetch(`/api/events/${eventId}/seating/assignments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: existing[0] }),
      });
    }
    setAssignPanelOpen(false);
  }

  const currentSeatGuestId = useMemo(() => {
    const table = tables.find((t) => t.id === selectedTableId);
    if (!table || selectedSeat === null) return undefined;
    const entry = Object.entries(assignments).find(
      ([, a]) =>
        a.tableNumber.toLowerCase() === table.label.toLowerCase() &&
        a.seatLabel === String(selectedSeat)
    );
    return entry?.[0];
  }, [assignments, selectedTableId, selectedSeat, tables]);

  if (loading) return <PageLoader label="Loading seating plan…" />;

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
        <p className="font-medium">{loadError}</p>
        <Button variant="outline" className="mt-4" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {saveError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {saveError}
        </div>
      )}
      {guestsTruncated && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Showing {guests.length.toLocaleString()} of {guestTotal.toLocaleString()} guests for seating.
          Use guest search when assigning from very large lists.
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Armchair className="h-6 w-6 text-[#0B8A83]" />
            Seating arrangement
          </h1>
          <p className="page-subtitle">
            Design your floor plan — tap seats to assign guests. Hover or tap a seat to see who is admitted.
          </p>
        </div>
        <Button onClick={() => void savePlan()} disabled={saving} className="bg-[#0B8A83] gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save plan"}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Tables", value: stats.tableCount, color: "bg-slate-50 text-slate-800" },
          { label: "Total seats", value: stats.totalSeats, color: "bg-blue-50 text-blue-800" },
          { label: "Assigned", value: stats.assigned, color: "bg-teal-50 text-teal-800" },
          { label: "Admitted", value: stats.admitted, color: "bg-emerald-50 text-emerald-800" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Plan settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Plan name</Label>
                <Input value={planName} onChange={(e) => setPlanName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Expected guests</Label>
                <Input
                  type="number"
                  min={1}
                  value={expectedGuests || ""}
                  onChange={(e) => setExpectedGuests(Number(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#D4A63A]" />
                Auto-generate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Guest count</Label>
                <Input
                  type="number"
                  min={1}
                  value={genGuestCount}
                  onChange={(e) => setGenGuestCount(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <Label>Seats per table</Label>
                <Input
                  type="number"
                  min={2}
                  max={20}
                  value={genSeatsPerTable}
                  onChange={(e) => setGenSeatsPerTable(Number(e.target.value) || 8)}
                />
              </div>
              <div className="space-y-1">
                <Label>Table shape</Label>
                <div className="flex gap-1">
                  {SHAPE_OPTIONS.map(({ id, label, icon: Icon }) => (
                    <Button
                      key={id}
                      type="button"
                      size="sm"
                      variant={genShape === id ? "default" : "outline"}
                      className="flex-1 gap-1 text-xs"
                      onClick={() => {
                        setGenShape(id);
                        setGenSeatsPerTable(defaultSeatCount(id));
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <Button variant="secondary" className="w-full" onClick={autoGenerateTables}>
                Generate {Math.max(1, Math.ceil((genGuestCount || guests.length) / genSeatsPerTable))} tables
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Add table</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Table name or number"
                value={newTableLabel}
                onChange={(e) => setNewTableLabel(e.target.value)}
              />
              <Input
                placeholder="Zone (optional)"
                value={newTableZone}
                onChange={(e) => setNewTableZone(e.target.value)}
              />
              <div className="flex gap-1">
                {SHAPE_OPTIONS.map(({ id, icon: Icon }) => (
                  <Button
                    key={id}
                    type="button"
                    size="icon"
                    variant={newTableShape === id ? "default" : "outline"}
                    onClick={() => {
                      setNewTableShape(id);
                      setNewTableSeats(defaultSeatCount(id));
                    }}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>
              <div className="space-y-1">
                <Label>Seats</Label>
                <Input
                  type="number"
                  min={2}
                  max={20}
                  value={newTableSeats}
                  onChange={(e) => setNewTableSeats(Number(e.target.value) || 8)}
                />
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={addTable} disabled={!newTableLabel.trim()}>
                <Plus className="h-4 w-4" /> Add table
              </Button>
            </CardContent>
          </Card>

          {selectedTable && (
            <Card className="border-[#0B8A83]/30 bg-brand-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{selectedTable.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Shape</Label>
                  <Select
                    value={selectedTable.shape ?? "round"}
                    onValueChange={(v) => updateTable(selectedTable.id, { shape: v as TableShape })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHAPE_OPTIONS.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Seat count</Label>
                  <Input
                    type="number"
                    min={2}
                    max={20}
                    value={selectedTable.seatCount ?? 8}
                    onChange={(e) =>
                      updateTable(selectedTable.id, {
                        seatCount: Number(e.target.value) || 8,
                        capacity: Number(e.target.value) || 8,
                      })
                    }
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => removeTable(selectedTable.id)}
                >
                  <Trash2 className="h-4 w-4" /> Remove table
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Tabs value={view} onValueChange={(v) => setView(v as "floor" | "list")}>
            <TabsList>
              <TabsTrigger value="floor" className="gap-1.5">
                <LayoutGrid className="h-4 w-4" /> Floor plan
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-1.5">
                <List className="h-4 w-4" /> Guest list
              </TabsTrigger>
            </TabsList>

            <TabsContent value="floor" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  <p className="text-xs text-slate-500 mb-4 text-center">
                    Tap a seat to assign a guest · Green = admitted at gate
                  </p>
                  <SeatingFloorPlan
                    tables={tables}
                    assignments={assignmentViews}
                    interactive
                    selectedTableId={selectedTableId}
                    selectedSeat={selectedSeat}
                    onTableSelect={setSelectedTableId}
                    onSeatSelect={handleSeatSelect}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="list" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Guests ({guests.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {guests.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">Add guests from the Guests page first.</p>
                  ) : (
                    guests.map((g) => {
                      const a = assignments[g.id];
                      const admitted = g.status === "CHECKED_IN";
                      return (
                        <div
                          key={g.id}
                          className="flex flex-wrap items-center gap-3 p-3 rounded-xl border bg-white"
                        >
                          <div className="flex-1 min-w-[140px]">
                            <p className="font-medium text-sm">{g.name}</p>
                            <p className="text-xs text-slate-500">{g.email ?? g.phone ?? "—"}</p>
                          </div>
                          {a ? (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {a.tableNumber} · Seat {a.seatLabel ?? "—"}
                              </Badge>
                              {admitted ? (
                                <Badge className="bg-emerald-100 text-emerald-800 gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Admitted
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Assigned</Badge>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-slate-400">
                              Unassigned
                            </Badge>
                          )}
                          <Link
                            href={`/seat/${g.qrToken}`}
                            target="_blank"
                            className="text-xs text-[#0B8A83] flex items-center gap-1 hover:underline"
                          >
                            <QrCode className="h-3.5 w-3.5" /> Preview
                          </Link>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {assignPanelOpen && selectedTable && selectedSeat !== null && (
        <SeatAssignPanel
          tableLabel={selectedTable.label}
          seatIndex={selectedSeat}
          guests={guests.map((g) => ({ id: g.id, name: g.name, email: g.email }))}
          currentGuestId={currentSeatGuestId}
          onAssign={assignGuestToSeat}
          onUnassign={() => void unassignSeat()}
          onClose={() => setAssignPanelOpen(false)}
        />
      )}
    </div>
  );
}
