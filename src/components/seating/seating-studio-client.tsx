"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Armchair,
  Focus,
  LayoutGrid,
  List,
  Plus,
  Redo2,
  Save,
  Sparkles,
  Trash2,
  Undo2,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoader } from "@/components/ui/page-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeatAssignPanel } from "@/components/seating/seating-table-visual";
import { StudioTableVisual } from "@/components/seating/studio-table-visual";
import {
  autoAssignGuests,
  computeCapacitySnapshot,
  defaultTablePosition,
  detectSeatingConflicts,
  freeSeatLabels,
  normalizeStudioLayout,
  normalizeStudioTable,
  partyGuestIds,
  resolveStudioSettings,
  snapToGrid,
  suggestSeatingForParty,
} from "@/lib/seating/studio-engine";
import {
  TABLE_KIND_PRESETS,
  ZONE_PRESETS,
  type StudioAssignment,
  type StudioGuest,
  type StudioLayout,
  type StudioTableConfig,
  type StudioTableKind,
  type StudioVenueElement,
  type VenueElementKind,
  type SeatingConflict,
  type SeatingSuggestion,
} from "@/lib/seating/studio-types";
import {
  compareGuestsForSeatingAssign,
  seatingPlanningLabel,
} from "@/lib/seating/guest-planning-status";
import {
  normalizeTableName,
  tableDisplayName,
  tablesMatch,
  type GuestAssignmentView,
} from "@/lib/seating/seating-types";
import { cn } from "@/lib/utils";

interface SeatingStudioClientProps {
  eventId: string;
}

type HistorySnapshot = {
  tables: StudioTableConfig[];
  assignments: Record<string, StudioAssignment>;
  layout: StudioLayout;
};

const VENUE_ELEMENT_PRESETS: Array<{ kind: VenueElementKind; label: string }> = [
  { kind: "stage", label: "Stage" },
  { kind: "dance_floor", label: "Dance floor" },
  { kind: "dj", label: "DJ booth" },
  { kind: "buffet", label: "Buffet" },
  { kind: "bar", label: "Bar" },
  { kind: "cake", label: "Cake table" },
  { kind: "gift", label: "Gift table" },
  { kind: "photo_booth", label: "Photo booth" },
  { kind: "entrance", label: "Entrance" },
  { kind: "exit", label: "Exit" },
  { kind: "restroom", label: "Restroom" },
  { kind: "vip_lounge", label: "VIP lounge" },
  { kind: "registration", label: "Registration" },
];

export function SeatingStudioClient({ eventId }: SeatingStudioClientProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [planName, setPlanName] = useState("Main reception");
  const [guests, setGuests] = useState<StudioGuest[]>([]);
  const [tables, setTables] = useState<StudioTableConfig[]>([]);
  const [assignments, setAssignments] = useState<Record<string, StudioAssignment>>({});
  const [layout, setLayout] = useState<StudioLayout>(normalizeStudioLayout({}));
  const [view, setView] = useState<"canvas" | "list">("canvas");
  const [guestFilter, setGuestFilter] = useState("unassigned");
  const [guestQuery, setGuestQuery] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [suggestions, setSuggestions] = useState<SeatingSuggestion[]>([]);
  const [past, setPast] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);
  const dragRef = useRef<{ tableId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const panning = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const settings = resolveStudioSettings(layout);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setLoadError(null);
    const res = await fetch(`/api/events/${eventId}/seating`);
    const json = await res.json();
    if (!res.ok || !json.success) {
      setLoadError(json.error ?? "Could not load seating studio");
      if (!silent) setLoading(false);
      return;
    }

    const guestList: StudioGuest[] = (json.data.guests ?? []).map((guest: any) => ({
      id: guest.id,
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      qrToken: guest.qrToken,
      status: guest.status,
      plusOnes: guest.plusOnes ?? 0,
      invitationId: guest.invitationId ?? null,
      partySize:
        guest.admission?.allowance ??
        Math.max(1, 1 + Math.max(0, guest.plusOnes ?? 0)),
      tags: guest.tags ?? [],
      vip: Boolean(guest.tags?.some((tag: { label: string }) => /vip/i.test(tag.label))),
      accessible: Boolean(
        guest.tags?.some((tag: { label: string }) => /access|wheelchair/i.test(tag.label))
      ),
      admission: guest.admission
        ? {
            allowance: guest.admission.allowance,
            admittedCount: guest.admission.admittedCount,
            remainingCount: guest.admission.remainingCount,
            state: guest.admission.state,
          }
        : null,
    }));
    setGuests(guestList);

    if (json.data.plan) {
      setPlanName(json.data.plan.name);
      const normalized = normalizeStudioLayout(json.data.plan.layout);
      const withPositions = normalized.tables.map((table, index) => {
        const pos = defaultTablePosition(index, normalized.settings?.gridSize ?? 24);
        return normalizeStudioTable({
          ...table,
          x: table.x ?? pos.x,
          y: table.y ?? pos.y,
        });
      });
      setTables(withPositions);
      setLayout({ ...normalized, tables: withPositions });
      const map: Record<string, StudioAssignment> = {};
      for (const row of json.data.plan.assignments ?? []) {
        map[row.guestId] = {
          guestId: row.guestId,
          tableNumber: normalizeTableName(row.tableNumber),
          seatLabel: row.seatLabel ?? undefined,
          zone: row.zone ?? undefined,
          notes: row.notes ?? undefined,
        };
      }
      setAssignments(map);
    } else {
      setTables([]);
      setAssignments({});
      setLayout(normalizeStudioLayout({ status: "draft" }));
    }
    if (!silent) setLoading(false);
  }, [eventId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  const assignmentList = useMemo(() => Object.values(assignments), [assignments]);
  const conflicts = useMemo(
    () => detectSeatingConflicts({ guests, tables, assignments: assignmentList }),
    [guests, tables, assignmentList]
  );
  const capacity = useMemo(
    () =>
      computeCapacitySnapshot({
        guests,
        tables,
        assignments: assignmentList,
        conflicts,
      }),
    [guests, tables, assignmentList, conflicts]
  );

  const assignmentViews: GuestAssignmentView[] = useMemo(
    () =>
      assignmentList.map((assignment) => {
        const guest = guests.find((row) => row.id === assignment.guestId);
        return {
          guestId: assignment.guestId,
          guestName: guest?.name ?? "Guest",
          guestEmail: guest?.email,
          guestStatus: guest?.status,
          tableNumber: assignment.tableNumber,
          seatLabel: assignment.seatLabel,
          zone: assignment.zone,
          notes: assignment.notes,
          admitted:
            (guest?.admission?.admittedCount ?? 0) > 0 || guest?.status === "CHECKED_IN",
        };
      }),
    [assignmentList, guests]
  );

  const selectedTable = tables.find((table) => table.id === selectedTableId) ?? null;

  function pushHistory() {
    setPast((current) => [
      ...current.slice(-29),
      {
        tables: structuredClone(tables),
        assignments: structuredClone(assignments),
        layout: structuredClone(layout),
      },
    ]);
    setFuture([]);
  }

  function undo() {
    const previous = past[past.length - 1];
    if (!previous) return;
    setFuture((current) => [
      { tables: structuredClone(tables), assignments: structuredClone(assignments), layout: structuredClone(layout) },
      ...current,
    ]);
    setPast((current) => current.slice(0, -1));
    setTables(previous.tables);
    setAssignments(previous.assignments);
    setLayout(previous.layout);
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    setPast((current) => [
      ...current,
      { tables: structuredClone(tables), assignments: structuredClone(assignments), layout: structuredClone(layout) },
    ]);
    setFuture((current) => current.slice(1));
    setTables(next.tables);
    setAssignments(next.assignments);
    setLayout(next.layout);
  }

  async function persist(nextStatus?: "draft" | "published") {
    setSaving(true);
    setSaveError(null);
    const nextLayout: StudioLayout = {
      ...layout,
      tables: tables.map((table) => normalizeStudioTable(table)),
      status: nextStatus ?? layout.status ?? "draft",
      publishedAt:
        (nextStatus ?? layout.status) === "published"
          ? new Date().toISOString()
          : layout.publishedAt ?? null,
      revision: (layout.revision ?? 1) + (nextStatus === "published" ? 1 : 0),
      settings,
      expectedGuests: layout.expectedGuests ?? guests.length,
    };
    try {
      const planRes = await fetch(`/api/events/${eventId}/seating`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: planName, layout: nextLayout }),
      });
      const planData = await planRes.json();
      if (!planRes.ok || !planData.success) {
        setSaveError(planData.error ?? "Failed to save seating studio");
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
      setLayout(nextLayout);
      await load(true);
    } catch {
      setSaveError("Could not save seating studio. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  function addTable(kind: StudioTableKind = "round") {
    pushHistory();
    const preset = TABLE_KIND_PRESETS[kind];
    const index = tables.length;
    const pos = defaultTablePosition(index, settings.gridSize);
    const label = normalizeTableName(`${preset.label} ${index + 1}`);
    const table = normalizeStudioTable({
      id: `t-${Date.now()}`,
      label,
      kind,
      shape: preset.shape,
      seatCount: preset.defaultSeats,
      capacity: preset.defaultSeats,
      vip: preset.vip,
      x: pos.x,
      y: pos.y,
    });
    setTables((current) => [...current, table]);
    setSelectedTableId(table.id);
  }

  function addZonePreset(name: string, color: string) {
    pushHistory();
    setLayout((current) => ({
      ...current,
      zones: [
        ...(current.zones ?? []),
        { id: `z-${Date.now()}`, name, color },
      ],
    }));
  }

  function addVenueElement(kind: VenueElementKind, label: string) {
    pushHistory();
    const count = layout.elements?.length ?? 0;
    const element: StudioVenueElement = {
      id: `el-${Date.now()}`,
      kind,
      label,
      x: 40 + (count % 4) * 140,
      y: 40 + Math.floor(count / 4) * 90,
      width: kind === "dance_floor" || kind === "stage" ? 180 : 110,
      height: kind === "dance_floor" || kind === "stage" ? 100 : 56,
    };
    setLayout((current) => ({
      ...current,
      elements: [...(current.elements ?? []), element],
    }));
  }

  function removeVenueElement(elementId: string) {
    pushHistory();
    setLayout((current) => ({
      ...current,
      elements: (current.elements ?? []).filter((element) => element.id !== elementId),
    }));
  }

  function runSuggestions(guestId: string) {
    setSuggestions(
      suggestSeatingForParty({
        guests,
        guestId,
        tables,
        assignments: assignmentList,
        preferAdjacent: settings.preferAdjacentSeats,
      })
    );
  }

  function applySuggestion(suggestion: SeatingSuggestion) {
    pushHistory();
    setAssignments((current) => {
      const next = { ...current };
      suggestion.guestIds.forEach((guestId, index) => {
        next[guestId] = {
          guestId,
          tableNumber: suggestion.tableLabel,
          seatLabel: suggestion.seatLabels[index] ?? suggestion.seatLabels[0],
          zone: tables.find((table) => table.id === suggestion.tableId)?.zone,
        };
      });
      return next;
    });
  }

  function runAutoAssign() {
    pushHistory();
    const result = autoAssignGuests({
      guests,
      tables,
      assignments: assignmentList,
      keepGroupsTogether: settings.keepGroupsTogether,
      preferAdjacent: settings.preferAdjacentSeats,
    });
    const map: Record<string, StudioAssignment> = {};
    for (const row of result.assignments) map[row.guestId] = row;
    setAssignments(map);
    setSuggestions(result.suggestions);
    if (result.unresolvedGuestIds.length) {
      setSaveError(
        `Auto-assign seated most guests. ${result.unresolvedGuestIds.length} still need a table with enough free seats.`
      );
    } else {
      setSaveError(null);
    }
  }

  function assignGuestToSeat(guestId: string) {
    if (!selectedTable || selectedSeat == null) return;
    pushHistory();
    const party = partyGuestIds(guests, guestId);
    const free = freeSeatLabels(selectedTable, assignmentList.filter((row) => row.guestId !== guestId));
    const seatsNeeded = Math.max(1, party.partySize - party.guestIds.filter((id) => assignments[id]).length);
    const seats = free.slice(0, Math.max(1, seatsNeeded));
    setAssignments((current) => {
      const next = { ...current };
      for (const [id, row] of Object.entries(next)) {
        if (
          tablesMatch(row.tableNumber, selectedTable.label) &&
          row.seatLabel === String(selectedSeat)
        ) {
          delete next[id];
        }
      }
      // Primary guest on the clicked seat; remaining party on adjacent free seats.
      next[guestId] = {
        guestId,
        tableNumber: selectedTable.label,
        seatLabel: String(selectedSeat),
        zone: selectedTable.zone,
      };
      const others = party.guestIds.filter((id) => id !== guestId && !next[id]);
      seats
        .filter((seat) => seat !== String(selectedSeat))
        .forEach((seat, index) => {
          const otherId = others[index];
          if (!otherId) return;
          next[otherId] = {
            guestId: otherId,
            tableNumber: selectedTable.label,
            seatLabel: seat,
            zone: selectedTable.zone,
          };
        });
      return next;
    });
    setAssignOpen(false);
  }

  const filteredGuests = useMemo(() => {
    const needle = guestQuery.trim().toLowerCase();
    return guests
      .filter((guest) => {
        if (needle && !guest.name.toLowerCase().includes(needle) && !guest.email?.toLowerCase().includes(needle)) {
          return false;
        }
        const assigned = Boolean(assignments[guest.id]);
        if (guestFilter === "unassigned") return !assigned;
        if (guestFilter === "assigned") return assigned;
        if (guestFilter === "vip") return Boolean(guest.vip);
        if (guestFilter === "admitted") return (guest.admission?.admittedCount ?? 0) > 0;
        return true;
      })
      .slice()
      .sort(compareGuestsForSeatingAssign);
  }, [guests, guestQuery, guestFilter, assignments]);

  if (loading) return <PageLoader label="Opening Seating Studio…" />;
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
    <div className="space-y-4">
      {saveError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {saveError}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Armchair className="h-6 w-6 text-[#0B8A83]" />
            Celeventic Seating Studio
          </h1>
          <p className="page-subtitle">
            Design the venue, seat parties together, publish when ready, and watch live admission fill
            each table.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={layout.status === "published" ? "default" : "secondary"}>
            {layout.status === "published" ? "Published" : "Draft"}
          </Badge>
          <Button variant="outline" size="sm" onClick={undo} disabled={!past.length}>
            <Undo2 className="h-4 w-4" /> Undo
          </Button>
          <Button variant="outline" size="sm" onClick={redo} disabled={!future.length}>
            <Redo2 className="h-4 w-4" /> Redo
          </Button>
          <Button variant="outline" onClick={() => void persist("draft")} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save draft"}
          </Button>
          <Button className="bg-[#0B8A83]" onClick={() => void persist("published")} disabled={saving}>
            Publish plan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Tables", value: capacity.tableCount },
          { label: "Seats", value: capacity.totalSeats },
          { label: "Assigned", value: capacity.assignedSeats },
          { label: "Available", value: capacity.availableSeats },
          { label: "Admitted", value: capacity.admittedHeads },
          { label: "Conflicts", value: capacity.conflictCount },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-slate-500">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Plan name</Label>
                <Input value={planName} onChange={(event) => setPlanName(event.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(TABLE_KIND_PRESETS) as StudioTableKind[]).slice(0, 8).map((kind) => (
                  <Button key={kind} size="sm" variant="outline" onClick={() => addTable(kind)}>
                    <Plus className="h-3.5 w-3.5" /> {TABLE_KIND_PRESETS[kind].label}
                  </Button>
                ))}
              </div>
              <Button className="w-full gap-2" variant="secondary" onClick={runAutoAssign}>
                <Wand2 className="h-4 w-4" /> Auto-assign guests
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Zones</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {ZONE_PRESETS.map((zone) => (
                <Button
                  key={zone.name}
                  size="sm"
                  variant="outline"
                  onClick={() => addZonePreset(zone.name, zone.color)}
                >
                  <span className="mr-1.5 h-2.5 w-2.5 rounded-full" style={{ background: zone.color }} />
                  {zone.name}
                </Button>
              ))}
              {(layout.zones ?? []).map((zone) => (
                <Badge key={zone.id} variant="outline" className="gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: zone.color }} />
                  {zone.name}
                </Badge>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Venue features</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {VENUE_ELEMENT_PRESETS.map((preset) => (
                <Button
                  key={preset.kind}
                  size="sm"
                  variant="outline"
                  onClick={() => addVenueElement(preset.kind, preset.label)}
                >
                  <Plus className="h-3.5 w-3.5" /> {preset.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          {selectedTable && (
            <Card className="border-[#0B8A83]/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{tableDisplayName(selectedTable.label)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Table name</Label>
                  <Input
                    key={`${selectedTable.id}:${selectedTable.label}`}
                    defaultValue={selectedTable.label}
                    onBlur={(event) => {
                      const label = normalizeTableName(event.target.value);
                      if (!label) return;
                      pushHistory();
                      const previous = selectedTable.label;
                      setTables((current) =>
                        current.map((table) =>
                          table.id === selectedTable.id ? normalizeStudioTable({ ...table, label }) : table
                        )
                      );
                      setAssignments((current) =>
                        Object.fromEntries(
                          Object.entries(current).map(([guestId, assignment]) => [
                            guestId,
                            tablesMatch(assignment.tableNumber, previous)
                              ? { ...assignment, tableNumber: label }
                              : assignment,
                          ])
                        )
                      );
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Seats</Label>
                  <Input
                    type="number"
                    min={2}
                    max={20}
                    value={selectedTable.seatCount ?? 8}
                    onChange={(event) => {
                      pushHistory();
                      const seatCount = Number(event.target.value) || 8;
                      setTables((current) =>
                        current.map((table) =>
                          table.id === selectedTable.id
                            ? normalizeStudioTable({ ...table, seatCount, capacity: seatCount })
                            : table
                        )
                      );
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Zone</Label>
                  <Input
                    value={selectedTable.zone ?? ""}
                    onChange={(event) => {
                      setTables((current) =>
                        current.map((table) =>
                          table.id === selectedTable.id
                            ? { ...table, zone: event.target.value || undefined }
                            : table
                        )
                      );
                    }}
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    pushHistory();
                    setTables((current) => current.filter((table) => table.id !== selectedTable.id));
                    setAssignments((current) => {
                      const next = { ...current };
                      for (const [guestId, assignment] of Object.entries(next)) {
                        if (tablesMatch(assignment.tableNumber, selectedTable.label)) delete next[guestId];
                      }
                      return next;
                    });
                    setSelectedTableId(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Remove table
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={view} onValueChange={(value) => setView(value as "canvas" | "list")}>
              <TabsList>
                <TabsTrigger value="canvas" className="gap-1.5">
                  <LayoutGrid className="h-4 w-4" /> Canvas
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-1.5">
                  <List className="h-4 w-4" /> Accessible list
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="ml-auto flex flex-wrap gap-1">
              <Button size="icon" variant="outline" onClick={() => setZoom((value) => Math.min(1.8, value + 0.1))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => setZoom((value) => Math.max(0.55, value - 0.1))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
              >
                <Focus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {view === "canvas" ? (
            <Card>
              <CardContent className="p-0">
                <div
                  className="relative h-[70vh] overflow-hidden rounded-xl bg-[radial-gradient(circle_at_top,#f8fafc,transparent_55%),linear-gradient(#e2e8f022_1px,transparent_1px),linear-gradient(90deg,#e2e8f022_1px,transparent_1px)] bg-[size:auto,24px_24px,24px_24px]"
                  onPointerDown={(event) => {
                    if ((event.target as HTMLElement).closest("[data-table-node],[data-venue-node]")) return;
                    panning.current = {
                      startX: event.clientX,
                      startY: event.clientY,
                      origX: pan.x,
                      origY: pan.y,
                    };
                  }}
                  onPointerMove={(event) => {
                    if (panning.current) {
                      setPan({
                        x: panning.current.origX + (event.clientX - panning.current.startX),
                        y: panning.current.origY + (event.clientY - panning.current.startY),
                      });
                      return;
                    }
                    const drag = dragRef.current;
                    if (!drag) return;
                    const dx = (event.clientX - drag.startX) / zoom;
                    const dy = (event.clientY - drag.startY) / zoom;
                    const nextX = snapToGrid(drag.origX + dx, settings.gridSize, settings.snapToGrid);
                    const nextY = snapToGrid(drag.origY + dy, settings.gridSize, settings.snapToGrid);
                    if (drag.tableId.startsWith("element:")) {
                      const elementId = drag.tableId.slice("element:".length);
                      setLayout((current) => ({
                        ...current,
                        elements: (current.elements ?? []).map((element) =>
                          element.id === elementId ? { ...element, x: nextX, y: nextY } : element
                        ),
                      }));
                      return;
                    }
                    setTables((current) =>
                      current.map((table) =>
                        table.id === drag.tableId
                          ? {
                              ...table,
                              x: nextX,
                              y: nextY,
                            }
                          : table
                      )
                    );
                  }}
                  onPointerUp={() => {
                    if (dragRef.current) pushHistory();
                    dragRef.current = null;
                    panning.current = null;
                  }}
                >
                  <div
                    className="absolute left-0 top-0 origin-top-left"
                    style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                  >
                    {(layout.elements ?? []).map((element) => (
                      <div
                        key={element.id}
                        data-venue-node
                        className="absolute z-0 flex cursor-grab flex-col items-center justify-center rounded-xl border border-slate-300/80 bg-white/85 px-2 text-center shadow-sm active:cursor-grabbing"
                        style={{
                          left: element.x,
                          top: element.y,
                          width: element.width ?? 110,
                          height: element.height ?? 56,
                        }}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          dragRef.current = {
                            tableId: `element:${element.id}`,
                            startX: event.clientX,
                            startY: event.clientY,
                            origX: element.x,
                            origY: element.y,
                          };
                        }}
                        onDoubleClick={() => removeVenueElement(element.id)}
                        title="Double-click to remove"
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {element.kind.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs font-medium text-slate-800">{element.label}</span>
                      </div>
                    ))}
                    {tables.length === 0 && !(layout.elements ?? []).length ? (
                      <div className="flex h-[70vh] w-[720px] items-center justify-center text-sm text-slate-500">
                        Add a table or venue feature to start designing the floor plan.
                      </div>
                    ) : (
                      tables.map((table) => (
                        <div
                          key={table.id}
                          data-table-node
                          className="absolute z-10 cursor-grab active:cursor-grabbing"
                          style={{ left: table.x ?? 0, top: table.y ?? 0 }}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            setSelectedTableId(table.id);
                            dragRef.current = {
                              tableId: table.id,
                              startX: event.clientX,
                              startY: event.clientY,
                              origX: table.x ?? 0,
                              origY: table.y ?? 0,
                            };
                          }}
                        >
                          <StudioTableVisual
                            table={table}
                            assignments={assignmentViews}
                            selected={selectedTableId === table.id}
                            interactive
                            selectedSeat={selectedTableId === table.id ? selectedSeat : null}
                            onSelect={() => setSelectedTableId(table.id)}
                            onSeatSelect={(seatIndex) => {
                              setSelectedTableId(table.id);
                              setSelectedSeat(seatIndex);
                              setAssignOpen(true);
                            }}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Accessible guest list</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[70vh] space-y-2 overflow-y-auto">
                {guests.map((guest) => {
                  const assignment = assignments[guest.id];
                  return (
                    <div key={guest.id} className="flex flex-wrap items-center gap-2 rounded-xl border p-3">
                      <div className="min-w-[140px] flex-1">
                        <p className="font-medium">{guest.name}</p>
                        <p className="text-xs text-slate-500">{seatingPlanningLabel(guest.status)}</p>
                      </div>
                      {assignment ? (
                        <Badge variant="outline">
                          {tableDisplayName(assignment.tableNumber)} · Seat {assignment.seatLabel ?? "—"}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400">
                          Unassigned
                        </Badge>
                      )}
                      <Link
                        href={guest.qrToken ? `/seat/${guest.qrToken}` : "#"}
                        className="text-xs text-[#0B8A83] underline"
                      >
                        Preview
                      </Link>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Guests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Search guests"
                value={guestQuery}
                onChange={(event) => setGuestQuery(event.target.value)}
              />
              <div className="flex flex-wrap gap-1">
                {[
                  ["unassigned", "Unassigned"],
                  ["assigned", "Assigned"],
                  ["vip", "VIP"],
                  ["admitted", "Admitted"],
                  ["all", "All"],
                ].map(([key, label]) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={guestFilter === key ? "default" : "outline"}
                    onClick={() => setGuestFilter(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <div className="max-h-[42vh] space-y-2 overflow-y-auto">
                {filteredGuests.slice(0, 80).map((guest) => {
                  const assignment = assignments[guest.id];
                  return (
                    <div key={guest.id} className="rounded-xl border p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{guest.name}</p>
                          <p className="text-[11px] text-slate-500">
                            Party of {guest.partySize}
                            {guest.admission
                              ? ` · ${guest.admission.admittedCount}/${guest.admission.allowance} in`
                              : ""}
                          </p>
                        </div>
                        {assignment ? (
                          <Badge variant="outline" className="text-[10px]">
                            {tableDisplayName(assignment.tableNumber)}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Free
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => runSuggestions(guest.id)}>
                          <Sparkles className="h-3.5 w-3.5" /> Suggest
                        </Button>
                        {assignment && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              pushHistory();
                              setAssignments((current) => {
                                const next = { ...current };
                                delete next[guest.id];
                                return next;
                              });
                            }}
                          >
                            Unassign
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Smart suggestions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestions.length === 0 ? (
                <p className="text-sm text-slate-500">Select a guest and tap Suggest.</p>
              ) : (
                suggestions.map((suggestion) => (
                  <div key={suggestion.id} className="rounded-xl border p-3">
                    <p className="text-sm font-medium">{suggestion.tableLabel}</p>
                    <p className="mt-1 text-xs text-slate-500">{suggestion.reason}</p>
                    <Button size="sm" className="mt-2" onClick={() => applySuggestion(suggestion)}>
                      Assign seats {suggestion.seatLabels.join(", ")}
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Conflicts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {conflicts.length === 0 ? (
                <p className="text-sm text-emerald-700">No seating conflicts detected.</p>
              ) : (
                conflicts.slice(0, 8).map((conflict: SeatingConflict) => (
                  <div
                    key={conflict.id}
                    className={cn(
                      "rounded-xl border p-3 text-sm",
                      conflict.severity === "CRITICAL"
                        ? "border-red-200 bg-red-50 text-red-900"
                        : "border-amber-200 bg-amber-50 text-amber-900"
                    )}
                  >
                    <p className="font-medium">{conflict.message}</p>
                    {conflict.actionHint && (
                      <p className="mt-1 text-xs opacity-80">{conflict.actionHint}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {assignOpen && selectedTable && selectedSeat != null && (
        <SeatAssignPanel
          tableLabel={tableDisplayName(selectedTable.label)}
          seatIndex={selectedSeat}
          guests={guests.map((guest) => ({
            id: guest.id,
            name: guest.name,
            email: guest.email,
            status: guest.status,
            tags: guest.tags,
          }))}
          currentGuestId={
            Object.values(assignments).find(
              (assignment) =>
                tablesMatch(assignment.tableNumber, selectedTable.label) &&
                assignment.seatLabel === String(selectedSeat)
            )?.guestId
          }
          onAssign={assignGuestToSeat}
          onUnassign={() => {
            pushHistory();
            setAssignments((current) => {
              const next = { ...current };
              for (const [guestId, assignment] of Object.entries(next)) {
                if (
                  tablesMatch(assignment.tableNumber, selectedTable.label) &&
                  assignment.seatLabel === String(selectedSeat)
                ) {
                  delete next[guestId];
                }
              }
              return next;
            });
            setAssignOpen(false);
          }}
          onClose={() => setAssignOpen(false)}
        />
      )}
    </div>
  );
}
