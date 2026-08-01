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
import { PaginationBar } from "@/components/ui/pagination";
import { paginateList } from "@/lib/pagination-client";
import { SeatAssignPanel } from "@/components/seating/seating-table-visual";
import { StudioTableVisual } from "@/components/seating/studio-table-visual";
import { TableInspector } from "@/components/seating/table-inspector";
import {
  autoAssignGuests,
  computeCapacitySnapshot,
  defaultTablePosition,
  detectSeatingConflicts,
  normalizeStudioLayout,
  normalizeStudioTable,
  partyGuestIds,
  resolveStudioSettings,
  snapToGrid,
  suggestSeatingForParty,
} from "@/lib/seating/studio-engine";
import {
  seatingCapacityLabel,
  seatingPlanDefaultName,
  seatingPlanDisplayName,
  seatingPlanShortLabel,
} from "@/lib/seating/plan-display";
import {
  tableOccupancyCount,
  type SeatingCompanionHoldView,
} from "@/lib/seating/party-capacity";
import {
  CEREMONY_SECTION_PRESETS,
  detectCeremonyConflicts,
  generateCeremonyRows,
  findAdjacentCeremonyChairs,
  suggestCeremonyForParty,
  type CeremonyAisleLayout,
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
  ceremonyRows: CeremonyRow[];
  assignments: Record<string, StudioAssignment>;
  layout: StudioLayout;
};

function snapshotOf(input: {
  tables: StudioTableConfig[];
  ceremonyRows: CeremonyRow[];
  assignments: Record<string, StudioAssignment>;
  layout: StudioLayout;
}): HistorySnapshot {
  return {
    tables: structuredClone(input.tables),
    ceremonyRows: structuredClone(input.ceremonyRows),
    assignments: structuredClone(input.assignments),
    layout: structuredClone(input.layout),
  };
}

function ceremonyRowLetter(label: string): string {
  return label.replace(/^Row\s+/i, "").trim() || label;
}

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
  const [planName, setPlanName] = useState(() => seatingPlanDefaultName("RECEPTION"));
  const [planType, setPlanType] = useState<SeatingPlanKind>("RECEPTION");
  const [planId, setPlanId] = useState<string | null>(null);
  const [guests, setGuests] = useState<StudioGuest[]>([]);
  const [companionHolds, setCompanionHolds] = useState<SeatingCompanionHoldView[]>([]);
  const [partyPlans, setPartyPlans] = useState<Array<{ invitationId: string; splitConfirmed: boolean }>>([]);
  const [tables, setTables] = useState<StudioTableConfig[]>([]);
  const [ceremonyRows, setCeremonyRows] = useState<CeremonyRow[]>([]);
  const [assignments, setAssignments] = useState<Record<string, StudioAssignment>>({});
  const [layout, setLayout] = useState<StudioLayout>(normalizeStudioLayout({}));
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [ceremonyGen, setCeremonyGen] = useState<{
    rows: number;
    chairsPerRow: number;
    aisle: CeremonyAisleLayout;
    sectionId: string;
  }>({ rows: 12, chairsPerRow: 10, aisle: "centre", sectionId: "" });
  const [previewMode, setPreviewMode] = useState(false);
  const guestPanelRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<"canvas" | "list">("canvas");
  const [guestFilter, setGuestFilter] = useState("unassigned");
  const [guestQuery, setGuestQuery] = useState("");
  const [guestListPage, setGuestListPage] = useState(1);
  const GUEST_LIST_PAGE_SIZE = 40;
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [suggestions, setSuggestions] = useState<SeatingSuggestion[]>([]);
  const [past, setPast] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);
  const dirtyRef = useRef(false);
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
    // Never fall back across plan types — Main Ceremony and Reception are independent.
    const selected =
      plans.find((plan) => (plan.planType ?? "RECEPTION") === activeType) ?? null;

    // While the organizer is editing, keep refreshing guest admission data only.
    if (silent && dirtyRef.current) {
      return;
    }

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
      const pack = json.data.holdsByPlanId?.[selected.id];
      const isReceptionPrimary = selected.id === json.data.plan?.id;
      setCompanionHolds(pack?.companionHolds ?? (isReceptionPrimary ? json.data.companionHolds : []) ?? []);
      setPartyPlans(pack?.partyPlans ?? (isReceptionPrimary ? json.data.partyPlans : []) ?? []);
      dirtyRef.current = false;
    } else if (silent) {
      // No saved plan for this type yet — preserve the in-progress local draft.
    } else {
      setPlanId(null);
      setPlanType(activeType);
      setTables([]);
      setCeremonyRows([]);
      setAssignments({});
      setCompanionHolds([]);
      setPartyPlans([]);
      setSelectedTableId(null);
      setSelectedSeat(null);
      setSuggestions([]);
      setPast([]);
      setFuture([]);
      setPlanName(seatingPlanDefaultName(activeType));
      setLayout(normalizeStudioLayout({ status: "draft", planKind: activeType, tables: [] }));
      dirtyRef.current = false;
    }
    if (!silent) setLoading(false);
  }, [eventId, planType]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  const assignmentList = useMemo(() => Object.values(assignments), [assignments]);
  const confirmedSplitInvitationIds = useMemo(
    () => new Set(partyPlans.filter((plan) => plan.splitConfirmed).map((plan) => plan.invitationId)),
    [partyPlans]
  );
  const conflicts = useMemo(
    () =>
      planType === "CEREMONY"
        ? detectCeremonyConflicts({ guests, rows: ceremonyRows, assignments: assignmentList })
        : detectSeatingConflicts({
            guests,
            tables,
            assignments: assignmentList,
            companionHolds,
            confirmedSplitInvitationIds,
          }),
    [planType, guests, tables, ceremonyRows, assignmentList, companionHolds, confirmedSplitInvitationIds]
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
    dirtyRef.current = true;
    setPast((current) => [
      ...current.slice(-29),
      snapshotOf({ tables, ceremonyRows, assignments, layout }),
    ]);
    setFuture([]);
  }

  function undo() {
    const previous = past[past.length - 1];
    if (!previous) return;
    dirtyRef.current = true;
    setFuture((current) => [
      snapshotOf({ tables, ceremonyRows, assignments, layout }),
      ...current,
    ]);
    setPast((current) => current.slice(0, -1));
    setTables(previous.tables);
    setCeremonyRows(previous.ceremonyRows);
    setAssignments(previous.assignments);
    setLayout(previous.layout);
  }

  function redo() {
    const next = future[0];
    if (!next) return;
    dirtyRef.current = true;
    setPast((current) => [
      ...current,
      snapshotOf({ tables, ceremonyRows, assignments, layout }),
    ]);
    setFuture((current) => current.slice(1));
    setTables(next.tables);
    setCeremonyRows(next.ceremonyRows);
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
        body: JSON.stringify({
          name: planName,
          planType,
          expectedRevision: layout.revision ?? 0,
          layout: nextLayout,
        }),
      });
      const planData = await planRes.json();
      if (!planRes.ok || !planData.success) {
        if (planRes.status === 409 || planData.code === "STALE_REVISION") {
          setSaveError(
            planData.error ??
              "This seating plan was updated by another organiser. Review the latest version before saving."
          );
          return;
        }
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
      dirtyRef.current = false;
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

  async function autoRemoveAssignment(guestId: string) {
    setAutoSaveState("saving");
    try {
      const res = await fetch(`/api/events/${eventId}/seating/assignments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId, planType }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        setAutoSaveState("failed");
        setSaveError(json.error ?? "Could not unassign seat");
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
    if (dirtyRef.current) {
      const ok = window.confirm(
        `Switch to ${next === "CEREMONY" ? "Main Ceremony" : "Event Seating"}? Unsaved layout edits on this plan stay local until you Save Draft or Publish.`
      );
      if (!ok) return;
    }
    dirtyRef.current = false;
    setPlanType(next);
    setSelectedTableId(null);
    setSelectedSeat(null);
    setSuggestions([]);
    setPast([]);
    setFuture([]);
    await load(false, next);
  }

  function generateCeremony() {
    pushHistory();
    const rows = generateCeremonyRows({
      rows: ceremonyGen.rows,
      chairsPerRow: ceremonyGen.chairsPerRow,
      aisle: ceremonyGen.aisle,
      naming: "letters",
      sectionId: ceremonyGen.sectionId || undefined,
    });
    setCeremonyRows(rows);
    setSelectedTableId(rows[0]?.id ?? null);
    setLayout((current) => ({ ...current, ceremonyRows: rows, planKind: "CEREMONY" }));
    setSaveError(null);
  }

  function addCeremonyRow() {
    pushHistory();
    const nextIndex = ceremonyRows.length;
    const sectionId = ceremonyGen.sectionId || undefined;
    const relabeled = generateCeremonyRows({
      rows: ceremonyRows.length + 1,
      chairsPerRow: ceremonyGen.chairsPerRow,
      aisle: ceremonyGen.aisle,
      naming: "letters",
      sectionId,
      startY: 40 + nextIndex * 72,
    });
    const appended = relabeled[relabeled.length - 1]!;
    // Keep existing rows in place; only append the new back row.
    const next = [
      ...ceremonyRows,
      {
        ...appended,
        sectionId: sectionId ?? appended.sectionId,
        x: 40,
        y: 40 + nextIndex * 72,
        chairs: appended.chairs.map((chair) => ({
          ...chair,
          y: 40 + nextIndex * 72,
          x: (chair.x ?? 40) - (appended.x ?? 40) + 40,
        })),
      },
    ];
    setCeremonyRows(next);
    setSelectedTableId(next[next.length - 1]?.id ?? null);
    setLayout((current) => ({ ...current, ceremonyRows: next, planKind: "CEREMONY" }));
  }

  function updateCeremonyRow(rowId: string, patch: Partial<CeremonyRow>) {
    dirtyRef.current = true;
    setCeremonyRows((current) => {
      const next = current.map((row) => (row.id === rowId ? { ...row, ...patch } : row));
      setLayout((layoutCurrent) => ({
        ...layoutCurrent,
        ceremonyRows: next,
        planKind: "CEREMONY",
      }));
      return next;
    });
  }

  function renameCeremonyRow(rowId: string, nextLabel: string) {
    const label = nextLabel.trim();
    if (!label) return;
    const row = ceremonyRows.find((item) => item.id === rowId);
    if (!row || row.label === label) return;
    pushHistory();
    const letter = ceremonyRowLetter(label);
    const previous = row.label;
    const nextChairs = row.chairs.map((chair, index) => ({
      ...chair,
      id: `chair-${letter}-${index + 1}`,
      label: `${letter}${index + 1}`,
    }));
    setCeremonyRows((current) =>
      current.map((item) =>
        item.id === rowId ? { ...item, label, chairs: nextChairs } : item
      )
    );
    setAssignments((current) => {
      const next = { ...current };
      for (const [guestId, assignment] of Object.entries(next)) {
        if (!tablesMatch(assignment.tableNumber, previous)) continue;
        const oldChair = row.chairs.find((chair) => chair.label === assignment.seatLabel);
        const mapped = oldChair
          ? nextChairs.find((chair) => chair.index === oldChair.index)
          : undefined;
        next[guestId] = {
          ...assignment,
          tableNumber: label,
          seatLabel: mapped?.label ?? assignment.seatLabel,
        };
      }
      return next;
    });
  }

  function resizeCeremonyRow(rowId: string, chairCount: number) {
    const count = Math.max(1, Math.min(40, Math.trunc(chairCount) || 1));
    const row = ceremonyRows.find((item) => item.id === rowId);
    if (!row || row.chairCount === count) return;
    pushHistory();
    const letter = ceremonyRowLetter(row.label);
    const generated = generateCeremonyRows({
      rows: 1,
      chairsPerRow: count,
      aisle: ceremonyGen.aisle,
      naming: "letters",
      sectionId: row.sectionId,
      startX: row.x ?? 40,
      startY: row.y ?? 40,
    })[0]!;
    const chairs = generated.chairs.map((chair, index) => ({
      ...chair,
      id: `chair-${letter}-${index + 1}`,
      label: `${letter}${index + 1}`,
    }));
    const keptLabels = new Set(chairs.map((chair) => chair.label.toLowerCase()));
    setCeremonyRows((current) =>
      current.map((item) =>
        item.id === rowId ? { ...item, chairCount: count, chairs } : item
      )
    );
    setAssignments((current) => {
      const next = { ...current };
      for (const [guestId, assignment] of Object.entries(next)) {
        if (!tablesMatch(assignment.tableNumber, row.label)) continue;
        if (!assignment.seatLabel || !keptLabels.has(assignment.seatLabel.toLowerCase())) {
          delete next[guestId];
          void autoRemoveAssignment(guestId);
        }
      }
      return next;
    });
  }

  function removeCeremonyRow(rowId: string) {
    const row = ceremonyRows.find((item) => item.id === rowId);
    if (!row) return;
    pushHistory();
    setCeremonyRows((current) => current.filter((item) => item.id !== rowId));
    setAssignments((current) => {
      const next = { ...current };
      for (const [guestId, assignment] of Object.entries(next)) {
        const onRow =
          tablesMatch(assignment.tableNumber, row.label) ||
          row.chairs.some((chair) => chair.label === assignment.seatLabel);
        if (onRow) {
          delete next[guestId];
          void autoRemoveAssignment(guestId);
        }
      }
      return next;
    });
    setSelectedTableId(null);
    setSelectedSeat(null);
    setLayout((current) => ({
      ...current,
      ceremonyRows: (current.ceremonyRows ?? []).filter((item) => item.id !== rowId),
      planKind: "CEREMONY",
    }));
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
      zones: [
        ...(current.zones ?? []),
        { id: `z-${Date.now()}`, name: section.name, color: section.color },
      ],
      planKind: "CEREMONY",
    }));
    setCeremonyGen((current) => ({ ...current, sectionId: section.id }));
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

  async function releaseHold(holdId: string) {
    try {
      const res = await fetch(`/api/events/${eventId}/seating/party`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "release_hold", holdId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) {
        setSaveError(json.error ?? "Could not release companion place");
      }
    } catch {
      setSaveError("Could not release companion place. Check your connection and try again.");
    }
  }

  function renameSelectedTable(nextLabel: string) {
    if (!selectedTable) return;
    const label = normalizeTableName(nextLabel);
    if (!label || label === selectedTable.label) return;
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
    setCompanionHolds((current) =>
      current.map((hold) =>
        tablesMatch(hold.tableNumber, previous) ? { ...hold, tableNumber: label } : hold
      )
    );
  }

  function deleteSelectedTable() {
    if (!selectedTable) return;
    const occupants = tableOccupancyCount({
      tableLabel: selectedTable.label,
      assignments: assignmentList,
      holds: companionHolds,
    });
    if (occupants > 0) {
      const choice = window.confirm(
        `This table contains ${occupants} assigned places.\n\nOK = return everyone to Unassigned and delete table\nCancel = keep table`
      );
      if (!choice) return;
    }
    pushHistory();
    const removedGuestIds: string[] = [];
    setAssignments((current) => {
      const next = { ...current };
      for (const [guestId, assignment] of Object.entries(next)) {
        if (tablesMatch(assignment.tableNumber, selectedTable.label)) {
          removedGuestIds.push(guestId);
          delete next[guestId];
        }
      }
      return next;
    });
    const holdsOnTable = companionHolds.filter(
      (hold) => hold.status === "ACTIVE" && tablesMatch(hold.tableNumber, selectedTable.label)
    );
    setCompanionHolds((current) =>
      current.filter(
        (hold) => !(hold.status === "ACTIVE" && tablesMatch(hold.tableNumber, selectedTable.label))
      )
    );
    setTables((current) => current.filter((table) => table.id !== selectedTable.id));
    setSelectedTableId(null);
    setSelectedSeat(null);
    for (const guestId of removedGuestIds) void autoRemoveAssignment(guestId);
    for (const hold of holdsOnTable) void releaseHold(hold.id);
  }

  function unassignGuestFromSelectedTable(guestId: string) {
    pushHistory();
    setAssignments((current) => {
      const next = { ...current };
      delete next[guestId];
      return next;
    });
    void autoRemoveAssignment(guestId);
  }

  async function unassignHoldFromSelectedTable(holdId: string) {
    setCompanionHolds((current) => current.filter((hold) => hold.id !== holdId));
    await releaseHold(holdId);
  }

  function unassignAllOnSelectedTable() {
    if (!selectedTable) return;
    pushHistory();
    const removedGuestIds: string[] = [];
    setAssignments((current) => {
      const next = { ...current };
      for (const [guestId, assignment] of Object.entries(next)) {
        if (tablesMatch(assignment.tableNumber, selectedTable.label)) {
          removedGuestIds.push(guestId);
          delete next[guestId];
        }
      }
      return next;
    });
    const holdsOnTable = companionHolds.filter(
      (hold) => hold.status === "ACTIVE" && tablesMatch(hold.tableNumber, selectedTable.label)
    );
    setCompanionHolds((current) =>
      current.filter(
        (hold) => !(hold.status === "ACTIVE" && tablesMatch(hold.tableNumber, selectedTable.label))
      )
    );
    for (const guestId of removedGuestIds) void autoRemoveAssignment(guestId);
    for (const hold of holdsOnTable) void releaseHold(hold.id);
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
    const ceremonySectionName =
      planType === "CEREMONY"
        ? (layout.ceremonySections ?? []).find(
            (section) =>
              section.id ===
              ceremonyRows.find((row) => row.label === suggestion.tableLabel)?.sectionId
          )?.name
        : undefined;
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
              : ceremonySectionName ?? suggestion.tableLabel,
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

  async function assignGuestToSeat(guestId: string) {
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
      const sectionName = (layout.ceremonySections ?? []).find(
        (section) => section.id === row.sectionId
      )?.name;
      const created: StudioAssignment[] = [];
      setAssignments((current) => {
        const next = { ...current };
        party.guestIds.slice(0, block.length).forEach((id, index) => {
          const seat = block[index]!;
          const assignment: StudioAssignment = {
            guestId: id,
            tableNumber: row.label,
            seatLabel: seat.label,
            zone: sectionName ?? row.sectionId,
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
    const tableOnly = settings.receptionMode === "TABLE_ONLY";
    const mode: "FULL_PARTY" | "SELECTED_ONLY" = window.confirm(
      "Assign the full party (including companion places) to this table?\n\nOK = Full party\nCancel = Selected guest only"
    )
      ? "FULL_PARTY"
      : "SELECTED_ONLY";

    const attempt = async (confirmPartial: boolean): Promise<void> => {
      try {
        const res = await fetch(`/api/events/${eventId}/seating/party`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "assign",
            planType: "RECEPTION",
            guestId,
            tableNumber: selectedTable.label,
            mode,
            tableOnly,
            confirmPartial,
            zone: selectedTable.zone,
            seatLabels: tableOnly ? undefined : [String(selectedSeat)],
            tables,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          if (json.code === "PARTY_DOES_NOT_FIT" && !confirmPartial) {
            const force = window.confirm(
              `${json.error}\n\nAssign what fits and leave the rest unassigned?`
            );
            if (force) {
              await attempt(true);
              return;
            }
          }
          setSaveError(json.error ?? "Could not assign party");
          return;
        }
        const createdAssignments = (json.data?.assignments ?? []) as Array<{
          guestId: string;
          tableNumber: string;
          seatLabel: string | null;
          zone: string | null;
          notes: string | null;
        }>;
        setAssignments((current) => {
          const next = { ...current };
          for (const row of createdAssignments) {
            next[row.guestId] = {
              guestId: row.guestId,
              tableNumber: row.tableNumber,
              seatLabel: row.seatLabel ?? undefined,
              zone: row.zone ?? undefined,
              notes: row.notes ?? undefined,
            };
          }
          return next;
        });
        setAssignOpen(false);
        setSaveError(null);
        dirtyRef.current = false;
        await load(true, "RECEPTION");
      } catch {
        setSaveError("Could not assign party. Check your connection and try again.");
      }
    };

    await attempt(false);
  }

  function assignCeremonyParty(guestId: string) {
    const party = partyGuestIds(guests, guestId);
    const occupied = new Set(
      assignmentList.map((row) => row.seatLabel).filter(Boolean) as string[]
    );
    const preferSectionId =
      selectedCeremonyRow?.sectionId || ceremonyGen.sectionId || undefined;
    const suggestions = suggestCeremonyForParty({
      rows: ceremonyRows,
      needed: party.partySize,
      occupiedLabels: occupied,
      preferSectionId,
    });
    setSuggestions(
      suggestions.map((suggestion, index) => ({
        id: `ceremony-${index}`,
        invitationId: party.invitationId,
        guestIds: party.guestIds.slice(0, suggestion.seatLabels.length),
        tableId:
          ceremonyRows.find((row) => row.label === suggestion.rowLabel)?.id ??
          suggestion.rowLabel,
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

  useEffect(() => {
    setGuestListPage(1);
  }, [guestQuery, guestFilter]);

  const guestListSlice = useMemo(
    () => paginateList(filteredGuests, guestListPage, GUEST_LIST_PAGE_SIZE),
    [filteredGuests, guestListPage]
  );

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
              {seatingPlanDisplayName(planType)}
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
            {seatingPlanShortLabel("RECEPTION")}
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
                { label: seatingCapacityLabel("RECEPTION"), value: capacity.totalSeats },
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
                {planType === "CEREMONY" ? "a ceremony chair" : "an event table"}
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
          <div className="flex items-center gap-1.5">
            <Button variant="outline" disabled={previewMode} onClick={runAutoAssign}>
              <Sparkles className="h-4 w-4" /> Smart Assign
            </Button>
            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
              AGI Engine powered
            </span>
          </div>
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
          <div className="grid max-w-3xl gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="space-y-1">
              <Label>Aisle</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={ceremonyGen.aisle}
                disabled={previewMode}
                onChange={(event) =>
                  setCeremonyGen((current) => ({
                    ...current,
                    aisle: event.target.value as CeremonyAisleLayout,
                  }))
                }
              >
                <option value="centre">Centre aisle</option>
                <option value="left">Left aisle</option>
                <option value="right">Right aisle</option>
                <option value="two_side">Side aisles</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Default section</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={ceremonyGen.sectionId}
                disabled={previewMode}
                onChange={(event) =>
                  setCeremonyGen((current) => ({
                    ...current,
                    sectionId: event.target.value,
                  }))
                }
              >
                <option value="">Unassigned</option>
                {(layout.ceremonySections ?? []).map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
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
                      <button
                        key={section.id}
                        type="button"
                        disabled={previewMode}
                        onClick={() =>
                          setCeremonyGen((current) => ({
                            ...current,
                            sectionId: section.id,
                          }))
                        }
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                          ceremonyGen.sectionId === section.id
                            ? "border-[#0B8A83] bg-[#0B8A83]/10 text-[#0B8A83]"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        )}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: section.color }} />
                        {section.name}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Tip: select a section, then Auto-Generate or Add Row to place chairs into that
                    family block. Click a row to edit, drag to arrange, click a chair to assign.
                  </p>
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
            <TableInspector
              table={selectedTable}
              guests={guests}
              assignments={assignmentList}
              companionHolds={companionHolds}
              tableOnly={settings.receptionMode === "TABLE_ONLY"}
              previewMode={previewMode}
              variant="drawer"
              className="hidden lg:flex"
              onUpdateTable={(patch) => {
                pushHistory();
                setTables((current) =>
                  current.map((table) =>
                    table.id === selectedTable.id
                      ? normalizeStudioTable({ ...table, ...patch })
                      : table
                  )
                );
              }}
              onRenameTable={renameSelectedTable}
              onDeleteRequest={deleteSelectedTable}
              onAssignGuests={focusAssignGuests}
              onUnassignGuest={unassignGuestFromSelectedTable}
              onUnassignHold={(holdId) => void unassignHoldFromSelectedTable(holdId)}
              onUnassignAll={unassignAllOnSelectedTable}
            />
          )}

          {selectedCeremonyRow && planType === "CEREMONY" && !previewMode && (
            <Card className="border-[#0B8A83]/30 bg-gradient-to-b from-[#0B8A83]/5 to-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{selectedCeremonyRow.label}</CardTitle>
                <p className="text-xs text-slate-500">
                  {selectedCeremonyRow.chairs.length} chairs
                  {selectedCeremonyRow.sectionId
                    ? ` · ${(layout.ceremonySections ?? []).find((s) => s.id === selectedCeremonyRow.sectionId)?.name ?? "section"}`
                    : ""}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Row name</Label>
                  <Input
                    key={`${selectedCeremonyRow.id}:${selectedCeremonyRow.label}`}
                    defaultValue={selectedCeremonyRow.label}
                    onBlur={(event) => renameCeremonyRow(selectedCeremonyRow.id, event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Chairs in this row</Label>
                  <Input
                    type="number"
                    min={1}
                    max={40}
                    value={selectedCeremonyRow.chairCount}
                    onChange={(event) =>
                      resizeCeremonyRow(selectedCeremonyRow.id, Number(event.target.value) || 1)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Section</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedCeremonyRow.sectionId ?? ""}
                    onChange={(event) => {
                      pushHistory();
                      const sectionId = event.target.value || undefined;
                      const sectionName = (layout.ceremonySections ?? []).find(
                        (section) => section.id === sectionId
                      )?.name;
                      updateCeremonyRow(selectedCeremonyRow.id, { sectionId });
                      if (sectionName) {
                        setAssignments((current) => {
                          const next = { ...current };
                          for (const [guestId, assignment] of Object.entries(next)) {
                            if (tablesMatch(assignment.tableNumber, selectedCeremonyRow.label)) {
                              next[guestId] = { ...assignment, zone: sectionName };
                            }
                          }
                          return next;
                        });
                      }
                    }}
                  >
                    <option value="">Unassigned</option>
                    {(layout.ceremonySections ?? []).map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      pushHistory();
                      updateCeremonyRow(selectedCeremonyRow.id, {
                        locked: !selectedCeremonyRow.locked,
                      });
                    }}
                  >
                    {selectedCeremonyRow.locked ? "Unlock row" : "Lock row"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => removeCeremonyRow(selectedCeremonyRow.id)}
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </Button>
                </div>
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
                    if ((event.target as HTMLElement).closest("[data-table-node],[data-venue-node],[data-ceremony-row]"))
                      return;
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
                    if (drag.tableId.startsWith("row:")) {
                      const rowId = drag.tableId.slice("row:".length);
                      dirtyRef.current = true;
                      setCeremonyRows((current) =>
                        current.map((row) => {
                          if (row.id !== rowId) return row;
                          const offsetX = nextX - (row.x ?? 0);
                          const offsetY = nextY - (row.y ?? 0);
                          return {
                            ...row,
                            x: nextX,
                            y: nextY,
                            chairs: row.chairs.map((chair) => ({
                              ...chair,
                              x: (chair.x ?? row.x ?? 0) + offsetX,
                              y: (chair.y ?? row.y ?? 0) + offsetY,
                            })),
                          };
                        })
                      );
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
                          pushHistory();
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
                        <div className="flex h-[70vh] w-[720px] flex-col items-center justify-center gap-3 px-6 text-center">
                          <div className="rounded-2xl border border-dashed border-[#0B8A83]/40 bg-[#0B8A83]/5 px-8 py-10">
                            <p className="text-base font-semibold text-slate-800">
                              Build your ceremony seating
                            </p>
                            <p className="mt-2 max-w-sm text-sm text-slate-500">
                              Auto-generate rows with a centre aisle, add family sections, then click
                              chairs to assign guests — same workflow as event tables.
                            </p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                              <Button
                                size="sm"
                                className="bg-[#0B8A83]"
                                disabled={previewMode}
                                onClick={generateCeremony}
                              >
                                <Wand2 className="h-4 w-4" /> Auto-Generate Rows
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={previewMode}
                                onClick={addCeremonySection}
                              >
                                <Plus className="h-4 w-4" /> Add Section
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            className="absolute z-0 flex items-center justify-center rounded-lg border border-dashed border-slate-300/80 bg-white/50 px-6 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400"
                            style={{ left: 120, top: 8, minWidth: 200 }}
                          >
                            Ceremony front / altar
                          </div>
                          {ceremonyRows.map((row) => {
                            const section = (layout.ceremonySections ?? []).find(
                              (item) => item.id === row.sectionId
                            );
                            const rowWidth = Math.max(
                              120,
                              ...row.chairs.map(
                                (chair) => ((chair.x ?? row.x ?? 0) - (row.x ?? 0)) + 40
                              )
                            );
                            const selected = selectedTableId === row.id;
                            return (
                              <div
                                key={row.id}
                                data-ceremony-row
                                className={cn(
                                  "absolute z-10 cursor-grab rounded-xl p-2 active:cursor-grabbing",
                                  selected
                                    ? "bg-[#0B8A83]/10 ring-2 ring-[#0B8A83]/50"
                                    : "hover:bg-slate-50/80",
                                  row.locked && "opacity-80"
                                )}
                                style={{ left: row.x ?? 0, top: row.y ?? 0 }}
                                onPointerDown={(event) => {
                                  if (previewMode || row.locked) return;
                                  if ((event.target as HTMLElement).closest("button")) return;
                                  event.stopPropagation();
                                  pushHistory();
                                  setSelectedTableId(row.id);
                                  dragRef.current = {
                                    tableId: `row:${row.id}`,
                                    startX: event.clientX,
                                    startY: event.clientY,
                                    origX: row.x ?? 0,
                                    origY: row.y ?? 0,
                                  };
                                }}
                                onClick={() => {
                                  if (previewMode) return;
                                  setSelectedTableId(row.id);
                                }}
                              >
                                <div className="mb-1.5 flex items-center gap-2">
                                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                                    {row.label}
                                  </p>
                                  {section && (
                                    <span
                                      className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white"
                                      style={{ background: section.color }}
                                    >
                                      {section.name}
                                    </span>
                                  )}
                                  {row.locked && (
                                    <span className="text-[9px] font-medium uppercase tracking-wide text-slate-400">
                                      Locked
                                    </span>
                                  )}
                                </div>
                                <div className="relative h-11" style={{ width: rowWidth }}>
                                  {row.chairs.map((chair) => {
                                    const occupied = assignmentViews.find(
                                      (assignment) =>
                                        assignment.seatLabel === chair.label ||
                                        (tablesMatch(assignment.tableNumber, row.label) &&
                                          assignment.seatLabel === chair.label)
                                    );
                                    const seatSelected =
                                      selected && selectedSeat === chair.index;
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
                                          "absolute flex h-9 w-9 flex-col items-center justify-center rounded-md border text-[9px] font-semibold shadow-sm transition",
                                          occupied
                                            ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                                            : "border-slate-300 bg-white text-slate-700 hover:border-[#0B8A83]",
                                          seatSelected && "ring-2 ring-[#0B8A83] ring-offset-1",
                                          chair.accessible && "border-emerald-400"
                                        )}
                                        style={{
                                          left: (chair.x ?? row.x ?? 0) - (row.x ?? 0),
                                          top: 0,
                                        }}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          if (previewMode || row.locked) return;
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
                            );
                          })}
                        </>
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
                            pushHistory();
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
                            companionHoldCount={
                              companionHolds.filter(
                                (hold) => hold.status === "ACTIVE" && tablesMatch(hold.tableNumber, table.label)
                              ).length
                            }
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
                {guestListSlice.items.map((guest) => {
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
                              void autoRemoveAssignment(guest.id);
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
              <PaginationBar
                page={guestListSlice.page}
                pages={guestListSlice.pages}
                total={guestListSlice.total}
                limit={GUEST_LIST_PAGE_SIZE}
                onPageChange={setGuestListPage}
                showSummary={guestListSlice.pages > 1}
              />
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
                      Assign {planType === "CEREMONY" ? "chairs" : "seats"}{" "}
                      {suggestion.seatLabels.join(", ")}
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

      {selectedTable && planType === "RECEPTION" && !previewMode && (
        <TableInspector
          table={selectedTable}
          guests={guests}
          assignments={assignmentList}
          companionHolds={companionHolds}
          tableOnly={settings.receptionMode === "TABLE_ONLY"}
          previewMode={previewMode}
          variant="sheet"
          className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] rounded-t-2xl border bg-white p-4 shadow-2xl lg:hidden"
          onUpdateTable={(patch) => {
            pushHistory();
            setTables((current) =>
              current.map((table) =>
                table.id === selectedTable.id
                  ? normalizeStudioTable({ ...table, ...patch })
                  : table
              )
            );
          }}
          onRenameTable={renameSelectedTable}
          onDeleteRequest={deleteSelectedTable}
          onAssignGuests={focusAssignGuests}
          onUnassignGuest={unassignGuestFromSelectedTable}
          onUnassignHold={(holdId) => void unassignHoldFromSelectedTable(holdId)}
          onUnassignAll={unassignAllOnSelectedTable}
        />
      )}

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
          onAssign={(guestId) => void assignGuestToSeat(guestId)}
          onUnassign={() => {
            pushHistory();
            const removedGuestIds: string[] = [];
            for (const [guestId, assignment] of Object.entries(assignments)) {
              if (planType === "CEREMONY") {
                const chair = selectedCeremonyRow?.chairs.find(
                  (item) => item.index === selectedSeat
                );
                if (assignment.seatLabel === chair?.label) removedGuestIds.push(guestId);
                continue;
              }
              if (
                selectedTable &&
                tablesMatch(assignment.tableNumber, selectedTable.label) &&
                assignment.seatLabel === String(selectedSeat)
              ) {
                removedGuestIds.push(guestId);
              }
            }
            if (!removedGuestIds.length) {
              setAssignOpen(false);
              return;
            }
            setAssignments((current) => {
              const next = { ...current };
              for (const guestId of removedGuestIds) delete next[guestId];
              return next;
            });
            for (const guestId of removedGuestIds) void autoRemoveAssignment(guestId);
            setAssignOpen(false);
          }}
          onClose={() => setAssignOpen(false)}
        />
      )}
    </div>
  );
}
