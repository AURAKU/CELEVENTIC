"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Armchair,
  Eye,
  Focus,
  LayoutGrid,
  List,
  Plus,
  Redo2,
  Save,
  Sparkles,
  Trash2,
  Undo2,
  Users,
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
  CEREMONY_SECTION_PRESETS,
  generateCeremonyRows,
  findAdjacentCeremonyChairs,
  suggestCeremonyForParty,
  type CeremonyChair,
  type CeremonyRow,
} from "@/lib/seating/ceremony-engine";
import {
  computePeopleSeatingStats,
  requiredTablesForPeople,
} from "@/lib/seating/people-stats";
import {
  TABLE_KIND_PRESETS,
  ZONE_PRESETS,
  type ReceptionAssignmentMode,
  type SeatingPlanKind,
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
  const [planType, setPlanType] = useState<SeatingPlanKind>("RECEPTION");
  const [planId, setPlanId] = useState<string | null>(null);
  const [guests, setGuests] = useState<StudioGuest[]>([]);
  const [tables, setTables] = useState<StudioTableConfig[]>([]);
  const [ceremonyRows, setCeremonyRows] = useState<CeremonyRow[]>([]);
  const [assignments, setAssignments] = useState<Record<string, StudioAssignment>>({});
  const [layout, setLayout] = useState<StudioLayout>(normalizeStudioLayout({}));
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [ceremonyGen, setCeremonyGen] = useState({ rows: 12, chairsPerRow: 10 });
  const [previewMode, setPreviewMode] = useState(false);
  const guestPanelRef = useRef<HTMLDivElement | null>(null);
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

  const load = useCallback(async (silent = false, preferredType?: SeatingPlanKind) => {
    if (!silent) setLoading(true);
    if (!silent) setLoadError(null);
    const activeType = preferredType ?? planType;
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
        guest.partySize ??
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

    const plans = (json.data.plans ?? (json.data.plan ? [json.data.plan] : [])) as Array<{
      id: string;
      name: string;
      planType?: SeatingPlanKind;
      layout: unknown;
      assignments?: Array<{
        guestId: string;
        tableNumber: string;
        seatLabel?: string | null;
        zone?: string | null;
        notes?: string | null;
      }>;
    }>;
    const selected =
      plans.find((plan) => (plan.planType ?? "RECEPTION") === activeType) ??
      plans.find((plan) => (plan.planType ?? "RECEPTION") === "RECEPTION") ??
      plans[0] ??
      null;

    if (selected) {
      setPlanId(selected.id);
      setPlanName(selected.name);
      setPlanType((selected.planType as SeatingPlanKind) ?? activeType);
      const normalized = normalizeStudioLayout({
        ...(selected.layout as object),
        planKind: selected.planType ?? activeType,
      });
      const withPositions = normalized.tables.map((table, index) => {
        const pos = defaultTablePosition(index, normalized.settings?.gridSize ?? 24);
        return normalizeStudioTable({
          ...table,
          x: table.x ?? pos.x,
          y: table.y ?? pos.y,
        });
      });
      setTables(withPositions);
      setCeremonyRows(normalized.ceremonyRows ?? []);
      setLayout({ ...normalized, tables: withPositions });
      const map: Record<string, StudioAssignment> = {};
      for (const row of selected.assignments ?? []) {
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
      setPlanId(null);
      setTables([]);
      setCeremonyRows([]);
      setAssignments({});
      setPlanName(activeType === "CEREMONY" ? "Main ceremony" : "Main reception");
      setLayout(normalizeStudioLayout({ status: "draft", planKind: activeType, tables: [] }));
    }
    if (!silent) setLoading(false);
  }, [eventId, planType]);

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

  const peopleStats = useMemo(
    () =>
      computePeopleSeatingStats({
        guests,
        assignedGuestIds: new Set(Object.keys(assignments)),
        guestCountSource: settings.guestCountSource,
        customExpected: settings.customExpectedPeople,
      }),
    [guests, assignments, settings.guestCountSource, settings.customExpectedPeople]
  );

  const ceremonyChairCount = useMemo(
    () => ceremonyRows.reduce((sum, row) => sum + row.chairs.length, 0),
    [ceremonyRows]
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
  const selectedCeremonyRow = ceremonyRows.find((row) => row.id === selectedTableId) ?? null;
  const assignTargetLabel =
    planType === "CEREMONY"
      ? selectedCeremonyRow?.label ?? null
      : selectedTable
        ? tableDisplayName(selectedTable.label)
        : null;

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
      tables: planType === "RECEPTION" ? tables.map((table) => normalizeStudioTable(table)) : [],
      ceremonyRows: planType === "CEREMONY" ? ceremonyRows : layout.ceremonyRows,
      status: nextStatus ?? layout.status ?? "draft",
      publishedAt:
        (nextStatus ?? layout.status) === "published"
          ? new Date().toISOString()
          : layout.publishedAt ?? null,
      revision: (layout.revision ?? 1) + (nextStatus === "published" ? 1 : 0),
      settings,
      expectedGuests: peopleStats.expectedPeople,
      planKind: planType,
    };
    try {
      const planRes = await fetch(`/api/events/${eventId}/seating`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: planName, planType, layout: nextLayout }),
      });
      const planData = await planRes.json();
      if (!planRes.ok || !planData.success) {
        setSaveError(planData.error ?? "Failed to save seating studio");
        return;
      }
      const assignRes = await fetch(`/api/events/${eventId}/seating/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType,
          assignments: Object.values(assignments),
        }),
      });
      const assignData = await assignRes.json();
      if (!assignRes.ok || !assignData.success) {
        setSaveError(assignData.error ?? "Failed to save seat assignments");
        return;
      }
      setLayout(nextLayout);
      setPlanId(planData.data?.id ?? planId);
      await load(true, planType);
    } catch {
      setSaveError("Could not save seating studio. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function autoSaveAssignment(assignment: StudioAssignment) {
    setAutoSaveState("saving");
    try {
      const res = await fetch(`/api/events/${eventId}/seating/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType,
          autoSave: true,
          assignment,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setAutoSaveState("failed");
        setSaveError(json.error ?? "Assignment auto-save failed");
        return;
      }
      setAutoSaveState("saved");
      window.setTimeout(() => setAutoSaveState("idle"), 1600);
    } catch {
      setAutoSaveState("failed");
    }
  }

  async function switchPlanType(next: SeatingPlanKind) {
    if (next === planType) return;
    setPlanType(next);
    setSelectedTableId(null);
    setSelectedSeat(null);
    setSuggestions([]);
    await load(false, next);
  }

  function generateCeremony() {
    pushHistory();
    const rows = generateCeremonyRows({
      rows: ceremonyGen.rows,
      chairsPerRow: ceremonyGen.chairsPerRow,
      aisle: "centre",
      naming: "letters",
    });
    setCeremonyRows(rows);
    setLayout((current) => ({ ...current, ceremonyRows: rows, planKind: "CEREMONY" }));
  }

  function addCeremonyRow() {
    pushHistory();
    const nextIndex = ceremonyRows.length;
    const generated = generateCeremonyRows({
      rows: 1,
      chairsPerRow: ceremonyGen.chairsPerRow,
      aisle: "centre",
      naming: "letters",
      startY: 40 + nextIndex * 72,
    });
    // Relabel so appended rows continue the alphabet from existing count.
    const relabeled = generateCeremonyRows({
      rows: ceremonyRows.length + 1,
      chairsPerRow: ceremonyGen.chairsPerRow,
      aisle: "centre",
      naming: "letters",
    });
    const appended = relabeled[relabeled.length - 1] ?? generated[0]!;
    const next = [...ceremonyRows, appended];
    setCeremonyRows(next);
    setLayout((current) => ({ ...current, ceremonyRows: next, planKind: "CEREMONY" }));
  }

  function addCeremonySection() {
    pushHistory();
    const used = new Set((layout.ceremonySections ?? []).map((section) => section.name));
    const preset =
      CEREMONY_SECTION_PRESETS.find((section) => !used.has(section.name)) ??
      CEREMONY_SECTION_PRESETS[CEREMONY_SECTION_PRESETS.length - 1]!;
    const section = {
      ...preset,
      id: `section-${Date.now()}`,
      name: used.has(preset.name) ? `${preset.name} ${used.size + 1}` : preset.name,
    };
    setLayout((current) => ({
      ...current,
      ceremonySections: [...(current.ceremonySections ?? []), section],
      planKind: "CEREMONY",
    }));
    addZonePreset(section.name, section.color);
  }

  function autoGenerateTables() {
    const plan = requiredTablesForPeople(peopleStats.expectedPeople, 8);
    if (plan.tables <= 0) {
      setSaveError("No expected people yet — add guests or set a custom expected total first.");
      return;
    }
    if (tables.length > 0) {
      const ok = window.confirm(
        `Replace the current ${tables.length} table(s) with ${plan.tables} round tables of 8 for ${peopleStats.expectedPeople} expected people?`
      );
      if (!ok) return;
    }
    pushHistory();
    const next = Array.from({ length: plan.tables }, (_, index) => {
      const pos = defaultTablePosition(index, settings.gridSize);
      return normalizeStudioTable({
        id: `t-gen-${Date.now()}-${index}`,
        label: normalizeTableName(`Table ${index + 1}`),
        kind: "round",
        shape: "round",
        seatCount: 8,
        capacity: 8,
        x: pos.x,
        y: pos.y,
      });
    });
    setTables(next);
    setAssignments({});
    setLayout((current) => ({
      ...current,
      tables: next,
      planKind: "RECEPTION",
      expectedGuests: peopleStats.expectedPeople,
    }));
    setSaveError(null);
  }

  function focusAssignGuests() {
    setGuestFilter("unassigned");
    setPreviewMode(false);
    guestPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function setReceptionMode(mode: ReceptionAssignmentMode) {
    pushHistory();
    setLayout((current) => ({
      ...current,
      settings: { ...resolveStudioSettings(current), receptionMode: mode },
    }));
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
    if (planType === "CEREMONY") {
      assignCeremonyParty(guestId);
      return;
    }
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
    const created: StudioAssignment[] = [];
    setAssignments((current) => {
      const next = { ...current };
      suggestion.guestIds.forEach((guestId, index) => {
        const row: StudioAssignment = {
          guestId,
          tableNumber: suggestion.tableLabel,
          seatLabel:
            settings.receptionMode === "TABLE_ONLY" && planType === "RECEPTION"
              ? undefined
              : suggestion.seatLabels[index] ?? suggestion.seatLabels[0],
          zone:
            planType === "RECEPTION"
              ? tables.find((table) => table.id === suggestion.tableId)?.zone
              : suggestion.tableLabel,
        };
        next[guestId] = row;
        created.push(row);
      });
      return next;
    });
    for (const row of created) void autoSaveAssignment(row);
  }

  function runAutoAssign() {
    if (previewMode) return;
    pushHistory();

    if (planType === "CEREMONY") {
      if (!ceremonyRows.length) {
        setSaveError("Generate ceremony rows before auto-assigning guests.");
        return;
      }
      const occupied = new Set(
        assignmentList.map((item) => item.seatLabel).filter(Boolean) as string[]
      );
      const map: Record<string, StudioAssignment> = { ...assignments };
      const unresolved: string[] = [];
      const created: StudioAssignment[] = [];
      const seatedInvitation = new Set<string>();

      for (const guest of guests) {
        if (map[guest.id]) continue;
        if (guest.invitationId && seatedInvitation.has(guest.invitationId)) continue;
        const party = partyGuestIds(guests, guest.id);
        const suggestions = suggestCeremonyForParty({
          rows: ceremonyRows,
          needed: party.partySize,
          occupiedLabels: occupied,
        });
        const pick = suggestions[0];
        if (!pick) {
          unresolved.push(guest.id);
          continue;
        }
        const row = ceremonyRows.find((item) => item.label === pick.rowLabel);
        if (!row) {
          unresolved.push(guest.id);
          continue;
        }
        party.guestIds.slice(0, pick.seatLabels.length).forEach((id, index) => {
          const seatLabel = pick.seatLabels[index]!;
          occupied.add(seatLabel);
          const assignment: StudioAssignment = {
            guestId: id,
            tableNumber: row.label,
            seatLabel,
            zone: row.sectionId,
          };
          map[id] = assignment;
          created.push(assignment);
        });
        if (guest.invitationId) seatedInvitation.add(guest.invitationId);
      }

      setAssignments(map);
      setSuggestions([]);
      for (const row of created) void autoSaveAssignment(row);
      if (unresolved.length) {
        setSaveError(
          `Auto-assign seated most guests. ${unresolved.length} still need adjacent ceremony chairs.`
        );
      } else {
        setSaveError(null);
      }
      return;
    }

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
    for (const row of result.assignments) {
      if (!assignments[row.guestId] || assignments[row.guestId]?.seatLabel !== row.seatLabel) {
        void autoSaveAssignment(row);
      }
    }
    if (result.unresolvedGuestIds.length) {
      setSaveError(
        `Auto-assign seated most guests. ${result.unresolvedGuestIds.length} still need a table with enough free seats.`
      );
    } else {
      setSaveError(null);
    }
  }

  function assignGuestToSeat(guestId: string) {
    if (previewMode) return;
    if (planType === "CEREMONY") {
      const row = ceremonyRows.find((item) => item.id === selectedTableId);
      const chair = row?.chairs.find((item) => item.index === selectedSeat);
      if (!row || !chair) return;
      pushHistory();
      const party = partyGuestIds(guests, guestId);
      const occupied = new Set(
        assignmentList.map((item) => item.seatLabel).filter(Boolean) as string[]
      );
      occupied.delete(chair.label);
      const match = findAdjacentCeremonyChairs([row], party.partySize, occupied);
      const block: CeremonyChair[] = match?.chairs ?? [chair];
      const created: StudioAssignment[] = [];
      setAssignments((current) => {
        const next = { ...current };
        party.guestIds.slice(0, block.length).forEach((id, index) => {
          const seat = block[index]!;
          const assignment: StudioAssignment = {
            guestId: id,
            tableNumber: row.label,
            seatLabel: seat.label,
            zone: row.sectionId,
          };
          next[id] = assignment;
          created.push(assignment);
        });
        return next;
      });
      setAssignOpen(false);
      for (const rowAssignment of created) void autoSaveAssignment(rowAssignment);
      return;
    }

    if (!selectedTable || selectedSeat == null) return;
    pushHistory();
    const party = partyGuestIds(guests, guestId);
    const tableOnly = settings.receptionMode === "TABLE_ONLY";
    const free = freeSeatLabels(selectedTable, assignmentList.filter((row) => row.guestId !== guestId));
    const seatsNeeded = Math.max(1, party.partySize - party.guestIds.filter((id) => assignments[id]).length);
    const seats = free.slice(0, Math.max(1, seatsNeeded));
    const created: StudioAssignment[] = [];
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
      const primary: StudioAssignment = {
        guestId,
        tableNumber: selectedTable.label,
        seatLabel: tableOnly ? undefined : String(selectedSeat),
        zone: selectedTable.zone,
        notes: tableOnly ? `TABLE_ONLY:${party.partySize}` : undefined,
      };
      next[guestId] = primary;
      created.push(primary);
      if (!tableOnly) {
        const others = party.guestIds.filter((id) => id !== guestId && !next[id]);
        seats
          .filter((seat) => seat !== String(selectedSeat))
          .forEach((seat, index) => {
            const otherId = others[index];
            if (!otherId) return;
            const row: StudioAssignment = {
              guestId: otherId,
              tableNumber: selectedTable.label,
              seatLabel: seat,
              zone: selectedTable.zone,
            };
            next[otherId] = row;
            created.push(row);
          });
      }
      return next;
    });
    setAssignOpen(false);
    for (const row of created) void autoSaveAssignment(row);
  }

  function assignCeremonyParty(guestId: string) {
    const party = partyGuestIds(guests, guestId);
    const occupied = new Set(
      assignmentList.map((row) => row.seatLabel).filter(Boolean) as string[]
    );
    const suggestions = suggestCeremonyForParty({
      rows: ceremonyRows,
      needed: party.partySize,
      occupiedLabels: occupied,
    });
    setSuggestions(
      suggestions.map((suggestion, index) => ({
        id: `ceremony-${index}`,
        invitationId: party.invitationId,
        guestIds: party.guestIds.slice(0, suggestion.seatLabels.length),
        tableId: suggestion.rowLabel,
        tableLabel: suggestion.rowLabel,
        seatLabels: suggestion.seatLabels,
        score: suggestion.score,
        reason: suggestion.reason,
      }))
    );
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

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Seating Studio
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900">
              <Armchair className="h-6 w-6 text-[#0B8A83]" />
              {planType === "CEREMONY" ? "Main Ceremony" : "Reception Seating"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {planType === "CEREMONY"
                ? "Chairs only — rows, aisles and ceremony sections."
                : "Tables with table-only or table-and-chair assignment."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={layout.status === "published" ? "default" : "secondary"}>
              {layout.status === "published" ? "Published" : "Draft"}
            </Badge>
            {autoSaveState !== "idle" && (
              <Badge variant="outline">
                {autoSaveState === "saving"
                  ? "Saving…"
                  : autoSaveState === "saved"
                    ? "Saved"
                    : "Save failed"}
              </Badge>
            )}
            {previewMode && <Badge className="bg-slate-800">Preview</Badge>}
          </div>
        </div>

        <div className="inline-flex rounded-xl border bg-slate-50 p-1">
          <Button
            size="sm"
            variant={planType === "CEREMONY" ? "default" : "ghost"}
            className={planType === "CEREMONY" ? "bg-[#0B8A83]" : ""}
            onClick={() => void switchPlanType("CEREMONY")}
          >
            Main Ceremony
          </Button>
          <Button
            size="sm"
            variant={planType === "RECEPTION" ? "default" : "ghost"}
            className={planType === "RECEPTION" ? "bg-[#0B8A83]" : ""}
            onClick={() => void switchPlanType("RECEPTION")}
          >
            Reception
          </Button>
        </div>

        {planType === "RECEPTION" && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Assignment mode
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-6">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                <input
                  type="radio"
                  name="reception-mode"
                  checked={settings.receptionMode === "TABLE_ONLY"}
                  onChange={() => setReceptionMode("TABLE_ONLY")}
                  disabled={previewMode}
                />
                Table only
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-800">
                <input
                  type="radio"
                  name="reception-mode"
                  checked={settings.receptionMode !== "TABLE_ONLY"}
                  onChange={() => setReceptionMode("TABLE_AND_CHAIR")}
                  disabled={previewMode}
                />
                Table and specific chair
              </label>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(planType === "CEREMONY"
            ? [
                { label: "Expected people", value: peopleStats.expectedPeople },
                { label: "Chairs", value: ceremonyChairCount },
                { label: "Assigned", value: peopleStats.assignedPeople },
                { label: "Unassigned", value: peopleStats.unassignedPeople },
              ]
            : [
                { label: "Expected people", value: peopleStats.expectedPeople },
                { label: "Reception capacity", value: capacity.totalSeats },
                { label: "Assigned", value: peopleStats.assignedPeople },
                { label: "Unassigned", value: peopleStats.unassignedPeople },
              ]
          ).map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center">
              <p className="text-2xl font-bold text-slate-900">{item.value}</p>
              <p className="text-xs text-slate-500">{item.label}</p>
            </div>
          ))}
        </div>

        {peopleStats.unassignedPeople > 0 && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
            role="status"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-950">
                {peopleStats.unassignedPeople} guest
                {peopleStats.unassignedPeople === 1 ? "" : "s"} still need{" "}
                {planType === "CEREMONY" ? "a ceremony chair" : "a reception table"}
              </p>
              <p className="mt-0.5 text-xs text-amber-900/80">
                Assignments auto-save as you edit. Publish when this plan is ready for guests to see.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0 border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
              onClick={() => focusAssignGuests()}
            >
              Work on unassigned
            </Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {planType === "CEREMONY" ? (
            <>
              <Button variant="secondary" disabled={previewMode} onClick={generateCeremony}>
                <Wand2 className="h-4 w-4" /> Auto-Generate Rows
              </Button>
              <Button variant="outline" disabled={previewMode} onClick={addCeremonySection}>
                <Plus className="h-4 w-4" /> Add Section
              </Button>
              <Button variant="outline" disabled={previewMode} onClick={addCeremonyRow}>
                <Plus className="h-4 w-4" /> Add Row
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" disabled={previewMode} onClick={autoGenerateTables}>
                <Wand2 className="h-4 w-4" /> Auto-Generate Tables
              </Button>
              <Button variant="outline" disabled={previewMode} onClick={() => addTable("round")}>
                <Plus className="h-4 w-4" /> Add Table
              </Button>
            </>
          )}
          <Button variant="outline" disabled={previewMode} onClick={focusAssignGuests}>
            <Users className="h-4 w-4" /> Assign Guests
          </Button>
          <Button
            variant={previewMode ? "default" : "outline"}
            className={previewMode ? "bg-slate-800" : ""}
            onClick={() => setPreviewMode((value) => !value)}
          >
            <Eye className="h-4 w-4" /> {previewMode ? "Exit Preview" : "Preview"}
          </Button>
          <Button variant="outline" size="sm" onClick={undo} disabled={!past.length || previewMode}>
            <Undo2 className="h-4 w-4" /> Undo
          </Button>
          <Button variant="outline" size="sm" onClick={redo} disabled={!future.length || previewMode}>
            <Redo2 className="h-4 w-4" /> Redo
          </Button>
          <Button variant="outline" onClick={() => void persist("draft")} disabled={saving || previewMode}>
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save Draft"}
          </Button>
          <Button
            className="bg-[#0B8A83]"
            onClick={() => void persist("published")}
            disabled={saving || previewMode}
          >
            Publish
          </Button>
        </div>

        {planType === "CEREMONY" && (
          <div className="grid max-w-md grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Rows to generate</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={ceremonyGen.rows}
                disabled={previewMode}
                onChange={(event) =>
                  setCeremonyGen((current) => ({
                    ...current,
                    rows: Number(event.target.value) || 1,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Chairs per row</Label>
              <Input
                type="number"
                min={1}
                max={40}
                value={ceremonyGen.chairsPerRow}
                disabled={previewMode}
                onChange={(event) =>
                  setCeremonyGen((current) => ({
                    ...current,
                    chairsPerRow: Number(event.target.value) || 1,
                  }))
                }
              />
            </div>
          </div>
        )}

        {planType === "RECEPTION" && (
          <p className="text-xs text-slate-500">
            Auto-Generate Tables creates{" "}
            {requiredTablesForPeople(peopleStats.expectedPeople, 8).tables} round tables of 8 for{" "}
            {peopleStats.expectedPeople} expected people (
            {requiredTablesForPeople(peopleStats.expectedPeople, 8).spare} spare seats).
          </p>
        )}
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
                <Input
                  value={planName}
                  disabled={previewMode}
                  onChange={(event) => setPlanName(event.target.value)}
                />
              </div>
              {planType === "RECEPTION" ? (
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(TABLE_KIND_PRESETS) as StudioTableKind[]).slice(0, 8).map((kind) => (
                    <Button
                      key={kind}
                      size="sm"
                      variant="outline"
                      disabled={previewMode}
                      onClick={() => addTable(kind)}
                    >
                      <Plus className="h-3.5 w-3.5" /> {TABLE_KIND_PRESETS[kind].label}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">
                    Ceremony sections: {(layout.ceremonySections ?? []).length || "none yet"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(layout.ceremonySections ?? []).map((section) => (
                      <Badge key={section.id} variant="outline" className="gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ background: section.color }} />
                        {section.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <Button
                className="w-full gap-2"
                variant="secondary"
                disabled={previewMode}
                onClick={runAutoAssign}
              >
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
                  disabled={previewMode}
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
                  disabled={previewMode}
                  onClick={() => addVenueElement(preset.kind, preset.label)}
                >
                  <Plus className="h-3.5 w-3.5" /> {preset.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          {selectedTable && planType === "RECEPTION" && !previewMode && (
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
                          if (previewMode) return;
                          event.stopPropagation();
                          dragRef.current = {
                            tableId: `element:${element.id}`,
                            startX: event.clientX,
                            startY: event.clientY,
                            origX: element.x,
                            origY: element.y,
                          };
                        }}
                        onDoubleClick={() => {
                          if (previewMode) return;
                          removeVenueElement(element.id);
                        }}
                        title={previewMode ? element.label : "Double-click to remove"}
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {element.kind.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs font-medium text-slate-800">{element.label}</span>
                      </div>
                    ))}
                    {planType === "CEREMONY" ? (
                      ceremonyRows.length === 0 ? (
                        <div className="flex h-[70vh] w-[720px] items-center justify-center text-sm text-slate-500">
                          Generate ceremony rows to place chairs (no dining tables in this mode).
                        </div>
                      ) : (
                        ceremonyRows.map((row) => (
                          <div
                            key={row.id}
                            className="absolute z-10"
                            style={{ left: row.x ?? 0, top: row.y ?? 0 }}
                          >
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                              {row.label}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {row.chairs.map((chair) => {
                                const occupied = assignmentViews.find(
                                  (assignment) => assignment.seatLabel === chair.label
                                );
                                return (
                                  <button
                                    key={chair.id}
                                    type="button"
                                    title={
                                      occupied
                                        ? `${chair.label} · ${occupied.guestName}`
                                        : `${chair.label} available`
                                    }
                                    className={cn(
                                      "flex h-9 min-w-9 flex-col items-center justify-center rounded-md border px-1 text-[9px] font-semibold shadow-sm",
                                      occupied
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                                        : "border-slate-300 bg-white text-slate-700 hover:border-[#0B8A83]"
                                    )}
                                    onClick={() => {
                                      if (previewMode) return;
                                      // Ceremony assign uses row label + chair label directly.
                                      setSelectedTableId(row.id);
                                      setSelectedSeat(chair.index);
                                      setAssignOpen(true);
                                    }}
                                  >
                                    <Armchair className="h-3.5 w-3.5" aria-hidden />
                                    <span>{chair.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )
                    ) : tables.length === 0 && !(layout.elements ?? []).length ? (
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
                            if (previewMode) return;
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
                            interactive={!previewMode}
                            selectedSeat={selectedTableId === table.id ? selectedSeat : null}
                            onSelect={() => {
                              if (previewMode) return;
                              setSelectedTableId(table.id);
                            }}
                            onSeatSelect={(seatIndex) => {
                              if (previewMode) return;
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

        <div className="space-y-4" ref={guestPanelRef}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {guestFilter === "unassigned"
                  ? `Unassigned · ${filteredGuests.length}`
                  : "Guests"}
              </CardTitle>
              {guestFilter === "unassigned" && filteredGuests.length > 0 && (
                <p className="text-xs text-slate-500">
                  Select a table or row, then assign from this list. Changes save as you go.
                </p>
              )}
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
                            {planType === "CEREMONY"
                              ? `${tableDisplayName(assignment.tableNumber)}${
                                  assignment.seatLabel ? ` · ${assignment.seatLabel}` : ""
                                }`
                              : settings.receptionMode === "TABLE_ONLY"
                                ? tableDisplayName(assignment.tableNumber)
                                : `${tableDisplayName(assignment.tableNumber)}${
                                    assignment.seatLabel ? ` · Seat ${assignment.seatLabel}` : ""
                                  }`}
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-[10px] text-amber-900 hover:bg-amber-100"
                          >
                            Needs seat
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

      {assignOpen && assignTargetLabel && selectedSeat != null && (
        <SeatAssignPanel
          tableLabel={assignTargetLabel}
          seatIndex={selectedSeat}
          guests={guests.map((guest) => ({
            id: guest.id,
            name: guest.name,
            email: guest.email,
            status: guest.status,
            tags: guest.tags,
          }))}
          currentGuestId={
            Object.values(assignments).find((assignment) => {
              if (planType === "CEREMONY") {
                const chair = selectedCeremonyRow?.chairs.find((item) => item.index === selectedSeat);
                return assignment.seatLabel === chair?.label;
              }
              return (
                selectedTable &&
                tablesMatch(assignment.tableNumber, selectedTable.label) &&
                assignment.seatLabel === String(selectedSeat)
              );
            })?.guestId
          }
          onAssign={assignGuestToSeat}
          onUnassign={() => {
            pushHistory();
            setAssignments((current) => {
              const next = { ...current };
              for (const [guestId, assignment] of Object.entries(next)) {
                if (planType === "CEREMONY") {
                  const chair = selectedCeremonyRow?.chairs.find((item) => item.index === selectedSeat);
                  if (assignment.seatLabel === chair?.label) delete next[guestId];
                  continue;
                }
                if (
                  selectedTable &&
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
