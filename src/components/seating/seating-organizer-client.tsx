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
  RotateCcw,
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
  normalizeTableName,
  tableDisplayName,
  tablesMatch,
  type GuestAssignmentView,
  type SeatingLayoutConfig,
  type SeatingTableConfig,
  type TableShape,
} from "@/lib/seating/seating-types";
import {
  compareGuestsForSeatingAssign,
  seatingPlanningLabel,
} from "@/lib/seating/guest-planning-status";
import { cn } from "@/lib/utils";

interface GuestRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  qrToken: string;
  status?: string;
  plusOnes: number;
  invitationId: string | null;
  admission: {
    allowance: number;
    admittedCount: number;
    remainingCount: number;
    state: "NOT_ADMITTED" | "PARTIALLY_ADMITTED" | "ADMITTED";
  } | null;
  /** Private organizer CRM tags for seating arrangement. */
  tags?: { id: string; label: string }[];
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
  const [genTablePrefix, setGenTablePrefix] = useState("Table");
  const [resetting, setResetting] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      if (!silent) setLoadError(null);
      const res = await fetch(`/api/events/${eventId}/seating`);
      const d = await res.json();
      if (!res.ok || !d.success) {
        setLoadError(d.error ?? "Could not load seating plan");
        if (!silent) setLoading(false);
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
          const normalizedTables = rawTables.map((t) => normalizeTable(t));
          const repairedLabels = new Map(
            rawTables.map((table, index) => [
              table.label.trim().toLowerCase(),
              normalizedTables[index]?.label ?? table.label,
            ])
          );
          setTables(normalizedTables);
          setExpectedGuests(layout?.expectedGuests ?? guestList.length);

          const map: Record<string, AssignmentRow> = {};
          for (const a of d.data.plan.assignments ?? []) {
            const repairedTableNumber =
              repairedLabels.get(a.tableNumber.trim().toLowerCase()) ??
              normalizeTableName(a.tableNumber);
            map[a.guestId] = {
              guestId: a.guestId,
              tableNumber: repairedTableNumber,
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
      if (!silent) setLoading(false);
    },
    [eventId]
  );

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(true), 15_000);
    return () => window.clearInterval(interval);
  }, [load]);

  async function resetAllAdmissions() {
    const ok = window.confirm(
      "Reset ALL invitation admissions for this event?\n\nEveryone can be scanned again like first entry.\nEvent Companion locks for all until re-admit.\nInvite links start from the invitation intro again."
    );
    if (!ok) return;
    setResetting(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/qr/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "event", eventId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Could not reset all admissions.");
        return;
      }
      await load(true);
    } catch {
      setSaveError("Could not reach the server to reset admissions.");
    } finally {
      setResetting(false);
    }
  }

  async function resetInvitationAdmission(invitationId: string, guestName: string) {
    const ok = window.confirm(
      `Reset admission for ${guestName}?\n\nTheir QR / code works again like first entry.\nEvent Companion locks.\nTheir invite link starts from the invitation intro again.`
    );
    if (!ok) return;
    setResetting(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/invitations/${invitationId}/admission/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "entire",
          reason: "Organiser seating reset for exit / re-entry",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "Could not reset invitation admission.");
        return;
      }
      await load(true);
    } catch {
      setSaveError("Could not reach the server to reset admission.");
    } finally {
      setResetting(false);
    }
  }

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
        admitted: (guest?.admission?.admittedCount ?? 0) > 0 || guest?.status === "CHECKED_IN",
      };
    });
  }, [assignments, guests]);

  const stats = useMemo(() => {
    const assigned = Object.keys(assignments).length;
    const partyAdmissions = new Map<string, { admittedCount: number; remainingCount: number }>();
    for (const guest of guests) {
      if (guest.invitationId && guest.admission && !partyAdmissions.has(guest.invitationId)) {
        partyAdmissions.set(guest.invitationId, guest.admission);
      }
    }
    const admitted =
      Array.from(partyAdmissions.values()).reduce((sum, row) => sum + row.admittedCount, 0) +
      guests.filter((g) => !g.admission && g.status === "CHECKED_IN").length;
    const remaining = Array.from(partyAdmissions.values()).reduce(
      (sum, row) => sum + row.remainingCount,
      0
    );
    const accepted = guests.filter((g) => g.status === "ACCEPTED").length;
    const opened = guests.filter((g) => g.status === "OPENED").length;
    const totalSeats = tables.reduce((sum, t) => sum + (normalizeTable(t).seatCount ?? 8), 0);
    return {
      assigned,
      admitted,
      remaining,
      accepted,
      opened,
      unassigned: guests.length - assigned,
      totalSeats,
      tableCount: tables.length,
    };
  }, [assignments, guests, tables]);

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

      await load(true);
    } catch {
      setSaveError("Could not save the seating plan. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  function addTable() {
    const label = normalizeTableName(newTableLabel);
    if (!label) return;
    if (tables.some((t) => tablesMatch(t.label, label))) {
      setSaveError(`A table named "${tableDisplayName(label)}" already exists.`);
      return;
    }

    setSaveError(null);
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
    if (
      (tables.length > 0 || Object.keys(assignments).length > 0) &&
      !window.confirm(
        "Replace the current table layout?\n\nExisting tables and seat assignments will be cleared. This takes effect when you save."
      )
    ) {
      return;
    }
    const generated = generateTablesForGuests(count, genSeatsPerTable, genShape, genTablePrefix);
    setTables(generated.map((t) => normalizeTable(t)));
    setAssignments({});
    setSelectedTableId(null);
    setSelectedSeat(null);
    setAssignPanelOpen(false);
    setSaveError(null);
    setExpectedGuests(count);
  }

  function updateTable(id: string, patch: Partial<SeatingTableConfig>) {
    setTables((prev) => prev.map((t) => (t.id === id ? normalizeTable({ ...t, ...patch }) : t)));
  }

  function renameTable(id: string, value: string) {
    const table = tables.find((row) => row.id === id);
    if (!table) return;
    const label = normalizeTableName(value);
    if (!label) {
      setSaveError("Table name cannot be empty.");
      return;
    }
    if (tables.some((row) => row.id !== id && tablesMatch(row.label, label))) {
      setSaveError(`A table named "${tableDisplayName(label)}" already exists.`);
      return;
    }

    const previousLabel = table.label;
    updateTable(id, { label });
    setAssignments((current) =>
      Object.fromEntries(
        Object.entries(current).map(([guestId, assignment]) => [
          guestId,
          tablesMatch(assignment.tableNumber, previousLabel)
            ? { ...assignment, tableNumber: label }
            : assignment,
        ])
      )
    );
    setSaveError(null);
  }

  function updateTableSeatCount(id: string, nextSeatCount: number) {
    const table = tables.find((row) => row.id === id);
    if (!table) return;
    const highestAssignedSeat = Object.values(assignments)
      .filter((assignment) => tablesMatch(assignment.tableNumber, table.label))
      .reduce((highest, assignment) => {
        const seat = Number.parseInt(assignment.seatLabel ?? "", 10);
        return Number.isFinite(seat) ? Math.max(highest, seat) : highest;
      }, 0);
    if (nextSeatCount < highestAssignedSeat) {
      setSaveError(
        `Seat ${highestAssignedSeat} is occupied at ${tableDisplayName(table.label)}. Move that guest before reducing the table.`
      );
      return;
    }
    updateTable(id, { seatCount: nextSeatCount, capacity: nextSeatCount });
    setSaveError(null);
  }

  function removeTable(id: string) {
    const table = tables.find((t) => t.id === id);
    if (!table) return;
    const assignedCount = Object.values(assignments).filter((assignment) =>
      tablesMatch(assignment.tableNumber, table.label)
    ).length;
    if (
      !window.confirm(
        `Remove ${tableDisplayName(table.label)}?${
          assignedCount > 0
            ? `\n\n${assignedCount} guest${assignedCount === 1 ? " is" : "s are"} assigned here and will become unassigned.`
            : ""
        }`
      )
    ) {
      return;
    }
    setTables((prev) => prev.filter((t) => t.id !== id));
    setAssignments((prev) => {
      const next = { ...prev };
      for (const [guestId, a] of Object.entries(next)) {
        if (tablesMatch(a.tableNumber, table.label)) delete next[guestId];
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
        if (tablesMatch(a.tableNumber, table.label) && a.seatLabel === String(selectedSeat)) {
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
      ([, a]) => tablesMatch(a.tableNumber, table.label) && a.seatLabel === String(selectedSeat)
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
      ([, a]) => tablesMatch(a.tableNumber, table.label) && a.seatLabel === String(selectedSeat)
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
          Showing {guests.length.toLocaleString()} of {guestTotal.toLocaleString()} guests for
          seating. Use guest search when assigning from very large lists.
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Armchair className="h-6 w-6 text-[#0B8A83]" />
            Seating arrangement
          </h1>
          <p className="page-subtitle">
            Design your floor plan with live RSVP and gate accountability. Partial arrivals update
            automatically, including how many people remain on each invitation. Seat any guest —
            RSVP status only sorts priority, it never locks who you can place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-amber-200 text-amber-900 hover:bg-amber-50 gap-2"
            disabled={resetting}
            onClick={() => void resetAllAdmissions()}
          >
            <RotateCcw className="h-4 w-4" />
            {resetting ? "Resetting…" : "Reset all admissions"}
          </Button>
          <Button onClick={() => void savePlan()} disabled={saving} className="bg-[#0B8A83] gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save plan"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {[
          {
            label: "Tables",
            value: stats.tableCount,
            color: "bg-slate-50 text-slate-800",
          },
          {
            label: "Total seats",
            value: stats.totalSeats,
            color: "bg-blue-50 text-blue-800",
          },
          {
            label: "Assigned",
            value: stats.assigned,
            color: "bg-teal-50 text-teal-800",
          },
          {
            label: "Accepted",
            value: stats.accepted,
            color: "bg-teal-50 text-teal-900",
          },
          {
            label: "Opened invite",
            value: stats.opened,
            color: "bg-sky-50 text-sky-800",
          },
          {
            label: "Admitted heads",
            value: stats.admitted,
            color: "bg-emerald-50 text-emerald-800",
          },
          {
            label: "Still arriving",
            value: stats.remaining,
            color: "bg-amber-50 text-amber-800",
          },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 -mt-2">
        Accepted RSVPs help you prioritise seating, but you can assign seats to any guest —
        including invited, opened, maybe, or declined — whenever you need.
      </p>

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
                <Label>Table naming</Label>
                <Input
                  value={genTablePrefix}
                  maxLength={50}
                  placeholder="Table, VIP, Family…"
                  onChange={(e) => setGenTablePrefix(e.target.value)}
                />
                <p className="text-[11px] text-slate-500">
                  Generates {tableDisplayName(normalizeTableName(genTablePrefix) || "Table")} 1, 2,
                  3…
                </p>
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
                Generate{" "}
                {Math.max(1, Math.ceil((genGuestCount || guests.length) / genSeatsPerTable))} tables
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
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={addTable}
                disabled={!newTableLabel.trim()}
              >
                <Plus className="h-4 w-4" /> Add table
              </Button>
            </CardContent>
          </Card>

          {selectedTable && (
            <Card className="border-[#0B8A83]/30 bg-brand-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{tableDisplayName(selectedTable.label)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Table name</Label>
                  <Input
                    key={`${selectedTable.id}:${selectedTable.label}`}
                    defaultValue={selectedTable.label}
                    maxLength={80}
                    onBlur={(e) => renameTable(selectedTable.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                  />
                  <p className="text-[11px] text-slate-500">
                    Use a number or a custom name such as Bridal Party or Family A.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Zone</Label>
                  <Input
                    value={selectedTable.zone ?? ""}
                    maxLength={80}
                    placeholder="Main hall, terrace…"
                    onChange={(e) =>
                      updateTable(selectedTable.id, {
                        zone: e.target.value || undefined,
                      })
                    }
                  />
                </div>
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
                      updateTableSeatCount(selectedTable.id, Number(e.target.value) || 2)
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
                    Tap a seat to assign · Teal = accepted · Sky = opened invite · Green = admitted
                    at gate
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
                    Guests ({guests.length.toLocaleString()}
                    {guestTotal > guests.length ? ` of ${guestTotal.toLocaleString()}` : ""})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {guests.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">
                      Add guests from the Guests page first.
                    </p>
                  ) : (
                    guests
                      .slice()
                      .sort(compareGuestsForSeatingAssign)
                      .map((g) => {
                        const a = assignments[g.id];
                        const admitted =
                          (g.admission?.admittedCount ?? 0) > 0 || g.status === "CHECKED_IN";
                        const fullyAdmitted = g.admission?.state === "ADMITTED";
                        const partiallyAdmitted = g.admission?.state === "PARTIALLY_ADMITTED";
                        const statusLabel = seatingPlanningLabel(g.status);
                        const admissionLabel = g.admission
                          ? fullyAdmitted
                            ? `Fully admitted · ${g.admission.admittedCount}/${g.admission.allowance}`
                            : partiallyAdmitted
                              ? `Partially admitted · ${g.admission.admittedCount}/${g.admission.allowance} · ${g.admission.remainingCount} remaining`
                              : `Not admitted · 0/${g.admission.allowance}`
                          : statusLabel;
                        return (
                          <div
                            key={g.id}
                            className="flex flex-wrap items-center gap-3 p-3 rounded-xl border bg-white"
                          >
                            <div className="flex-1 min-w-[140px]">
                              <p className="font-medium text-sm">{g.name}</p>
                              <p className="text-xs text-slate-500">
                                {g.email ?? g.phone ?? "No contact"}
                              </p>
                            </div>
                            <Badge
                              className={cn(
                                "text-[10px]",
                                admitted
                                  ? fullyAdmitted
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-900"
                                  : g.status === "ACCEPTED"
                                    ? "bg-teal-100 text-teal-800"
                                    : g.status === "OPENED"
                                      ? "bg-sky-100 text-sky-800"
                                      : "bg-slate-100 text-slate-700"
                              )}
                            >
                              {admitted ? (
                                <span className="inline-flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> {admissionLabel}
                                </span>
                              ) : (
                                admissionLabel
                              )}
                            </Badge>
                            {a ? (
                              <Badge variant="outline">
                                {tableDisplayName(a.tableNumber)} · Seat {a.seatLabel ?? "—"}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-400">
                                Unassigned
                              </Badge>
                            )}
                            {g.invitationId && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-amber-200 text-amber-900 hover:bg-amber-50 gap-1"
                                disabled={resetting}
                                onClick={() =>
                                  void resetInvitationAdmission(g.invitationId!, g.name)
                                }
                                title="Reset this invitation admission"
                              >
                                <RotateCcw className="h-3.5 w-3.5" /> Reset
                              </Button>
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
          tableLabel={tableDisplayName(selectedTable.label)}
          seatIndex={selectedSeat}
          guests={guests.map((g) => ({
            id: g.id,
            name: g.name,
            email: g.email,
            status: g.status,
            tags: g.tags,
          }))}
          currentGuestId={currentSeatGuestId}
          onAssign={assignGuestToSeat}
          onUnassign={() => void unassignSeat()}
          onClose={() => setAssignPanelOpen(false)}
        />
      )}
    </div>
  );
}
