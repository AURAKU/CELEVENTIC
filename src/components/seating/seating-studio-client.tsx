"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import {
  Armchair,
  ChevronDown,
  ChevronUp,
  Download,
  Eraser,
  Eye,
  Focus,
  GripVertical,
  LayoutGrid,
  List,
  MapPin,
  Maximize2,
  Minimize2,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Rows3,
  Save,
  Sparkles,
  SquareStack,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaginationBar } from "@/components/ui/pagination";
import { paginateList } from "@/lib/pagination-client";
import { SeatAssignPanel } from "@/components/seating/seating-table-visual";
import { StudioTableVisual } from "@/components/seating/studio-table-visual";
import { TableInspector } from "@/components/seating/table-inspector";
import { VenueFeatureInspector } from "@/components/seating/venue-feature-inspector";
import { VenueFeatureVisual } from "@/components/seating/venue-feature-visual";
import { ZoneManager } from "@/components/seating/zone-manager";
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
  clampVenueFeatureSize,
  VENUE_FEATURE_COLOR_PRESETS,
  VENUE_FEATURE_PRESETS,
  venueFeaturePreset,
} from "@/lib/seating/venue-feature-presets";
import { downloadVenueMapPng } from "@/lib/seating/venue-map-export";
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
  detectCeremonyConflicts,
  defaultCeremonySections,
  generateCeremonyRows,
  findAdjacentCeremonyChairs,
  suggestCeremonyForParty,
  type CeremonyAisleLayout,
  type CeremonyChair,
  type CeremonyRow,
  type CeremonySection,
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

function normalizeRotationDegrees(degrees: number): number {
  return Math.round(((degrees % 360) + 360) % 360);
}

function snapRotationDegrees(degrees: number, step = 15): number {
  return normalizeRotationDegrees(Math.round(degrees / step) * step);
}

const PALETTE_MIME = "application/x-celeventic-seating-palette";

type PaletteDragPayload =
  | { type: "table"; kind: StudioTableKind }
  | { type: "element"; kind: VenueElementKind; label: string };

/** Canvas hit-target filter — matches Main Ceremony “select rows” vs venue features. */
type CanvasSelectMode = "all" | "rows" | "features";

function venueElementSize(kind: VenueElementKind): { width: number; height: number } {
  const preset = venueFeaturePreset(kind);
  return { width: preset.width, height: preset.height };
}

export function SeatingStudioClient({ eventId }: SeatingStudioClientProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mapExporting, setMapExporting] = useState(false);
  const [mapExportNotice, setMapExportNotice] = useState<string | null>(null);
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
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [paletteDropActive, setPaletteDropActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenChromeOpen, setFullscreenChromeOpen] = useState(false);
  const [canvasSelectMode, setCanvasSelectMode] = useState<CanvasSelectMode>("all");
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [customVenueLabel, setCustomVenueLabel] = useState("");
  const [customVenueColor, setCustomVenueColor] = useState<string>(VENUE_FEATURE_COLOR_PRESETS[0]!);
  const [suggestions, setSuggestions] = useState<SeatingSuggestion[]>([]);
  const [past, setPast] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);
  const dirtyRef = useRef(false);
  const dragRef = useRef<{ tableId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{
    elementId: string;
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);
  const rotateRef = useRef<{
    elementId: string;
    kind: "element" | "table" | "row";
    centerX: number;
    centerY: number;
    startAngle: number;
    origRotation: number;
  } | null>(null);
  const chromeSwipeRef = useRef<{ startY: number; opened: boolean } | null>(null);
  const panning = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const canvasSurfaceRef = useRef<HTMLDivElement | null>(null);
  const studioWorkspaceRef = useRef<HTMLDivElement | null>(null);

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

    type ApiGuest = {
      id: string;
      name: string;
      email?: string;
      phone?: string;
      qrToken?: string;
      status?: StudioGuest["status"];
      plusOnes?: number;
      invitationId?: string | null;
      partySize?: number;
      tags?: Array<{ id?: string; label: string }>;
      admission?: {
        allowance: number;
        admittedCount: number;
        remainingCount: number;
        state: NonNullable<StudioGuest["admission"]>["state"];
      } | null;
    };

    const guestList: StudioGuest[] = ((json.data.guests ?? []) as ApiGuest[]).map((guest) => ({
      id: guest.id,
      name: guest.name,
      email: guest.email ?? null,
      phone: guest.phone ?? null,
      qrToken: guest.qrToken,
      status: guest.status,
      plusOnes: guest.plusOnes ?? 0,
      invitationId: guest.invitationId ?? null,
      partySize:
        guest.partySize ??
        guest.admission?.allowance ??
        Math.max(1, 1 + Math.max(0, guest.plusOnes ?? 0)),
      tags: (guest.tags ?? []).map((tag, index) => ({
        id: tag.id ?? `${guest.id}-tag-${index}`,
        label: tag.label,
      })),
      vip: Boolean(guest.tags?.some((tag) => /vip/i.test(tag.label))),
      accessible: Boolean(
        guest.tags?.some((tag) => /access|wheelchair/i.test(tag.label))
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
      const seededLayout =
        (selected.planType ?? activeType) === "CEREMONY" &&
        !(normalized.ceremonySections ?? []).length
          ? {
              ...normalized,
              tables: withPositions,
              ceremonySections: defaultCeremonySections(),
            }
          : { ...normalized, tables: withPositions };
      setLayout(seededLayout);
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
      setLayout(
        normalizeStudioLayout({
          status: "draft",
          planKind: activeType,
          tables: [],
          ceremonySections: activeType === "CEREMONY" ? defaultCeremonySections() : [],
        })
      );
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
  const selectedElement =
    (layout.elements ?? []).find((element) => element.id === selectedElementId) ?? null;
  const assignTargetLabel =
    planType === "CEREMONY"
      ? selectedCeremonyRow?.label ?? null
      : selectedTable
        ? tableDisplayName(selectedTable.label)
        : null;

  function selectTable(tableId: string | null) {
    if (tableId !== null && canvasSelectMode === "features") return;
    setSelectedTableId(tableId);
    setSelectedElementId(null);
    if (tableId && planType === "CEREMONY") {
      setSelectedRowIds((current) => (current.includes(tableId) ? current : [tableId]));
    } else if (!tableId) {
      setSelectedRowIds([]);
    }
  }

  function selectElement(elementId: string | null) {
    if (elementId !== null && canvasSelectMode === "rows") return;
    setSelectedElementId(elementId);
    setSelectedTableId(null);
    setSelectedSeat(null);
    setSelectedRowIds([]);
  }

  function clearCanvasSelection() {
    setSelectedTableId(null);
    setSelectedElementId(null);
    setSelectedSeat(null);
    setSelectedRowIds([]);
  }

  function toggleRowSelection(rowId: string, additive: boolean) {
    if (canvasSelectMode === "features") return;
    setSelectedElementId(null);
    setSelectedSeat(null);
    setSelectedTableId(rowId);
    setSelectedRowIds((current) => {
      if (!additive) return [rowId];
      return current.includes(rowId)
        ? current.filter((id) => id !== rowId)
        : [...current, rowId];
    });
  }

  function canInteractWithRows() {
    return canvasSelectMode !== "features";
  }

  function canInteractWithFeatures() {
    return canvasSelectMode !== "rows";
  }

  function clientToCanvasPoint(clientX: number, clientY: number): { x: number; y: number } | null {
    const surface = canvasSurfaceRef.current;
    if (!surface) return null;
    const rect = surface.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return {
      x: snapToGrid(x, settings.gridSize, settings.snapToGrid),
      y: snapToGrid(y, settings.gridSize, settings.snapToGrid),
    };
  }

  function beginPaletteDrag(event: DragEvent, payload: PaletteDragPayload) {
    event.dataTransfer.setData(PALETTE_MIME, JSON.stringify(payload));
    event.dataTransfer.setData("text/plain", payload.type === "table" ? payload.kind : payload.label);
    event.dataTransfer.effectAllowed = "copy";
  }

  function handleCanvasPaletteDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setPaletteDropActive(false);
    if (previewMode) return;
    const raw = event.dataTransfer.getData(PALETTE_MIME);
    if (!raw) return;
    let payload: PaletteDragPayload;
    try {
      payload = JSON.parse(raw) as PaletteDragPayload;
    } catch {
      return;
    }
    const point = clientToCanvasPoint(event.clientX, event.clientY);
    if (!point) return;
    if (payload.type === "table") {
      addTable(payload.kind, point);
      return;
    }
    addVenueElement(payload.kind, payload.label, point);
  }

  function zoomBy(delta: number) {
    setZoom((value) => Math.min(2.4, Math.max(0.4, Number((value + delta).toFixed(2)))));
  }

  function resetCanvasView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  async function toggleStudioFullscreen() {
    const node = studioWorkspaceRef.current;
    if (!node) return;

    if (isFullscreen) {
      if (document.fullscreenElement === node) {
        try {
          await document.exitFullscreen();
        } catch {
          /* ignore */
        }
      }
      setIsFullscreen(false);
      setFullscreenChromeOpen(false);
      return;
    }

    setIsFullscreen(true);
    setFullscreenChromeOpen(false);
    setView("canvas");
    setTimeout(() => canvasSurfaceRef.current?.focus({ preventScroll: true }), 0);
    try {
      if (!document.fullscreenElement) {
        await node.requestFullscreen();
      }
    } catch {
      // Immersive CSS mode still covers the viewport when Fullscreen API is blocked.
    }
  }

  useEffect(() => {
    function onFullscreenChange() {
      const active = document.fullscreenElement === studioWorkspaceRef.current;
      if (active) {
        setIsFullscreen(true);
        setFullscreenChromeOpen(false);
        setView("canvas");
        setTimeout(() => canvasSurfaceRef.current?.focus({ preventScroll: true }), 0);
        return;
      }
      // Native Escape / exit — drop immersive shell only when no element is fullscreen.
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        setFullscreenChromeOpen(false);
      }
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

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

  /** Clears canvas content but keeps undo history so organisers can restore. */
  function clearAllCanvas(options?: { keepAssignments?: boolean }) {
    if (previewMode) return;
    const hasCeremony = ceremonyRows.length > 0 || (layout.elements ?? []).length > 0;
    const hasReception = tables.length > 0 || (layout.elements ?? []).length > 0;
    if (planType === "CEREMONY" && !hasCeremony) return;
    if (planType === "RECEPTION" && !hasReception) return;

    const message =
      planType === "CEREMONY"
        ? "Clear all ceremony rows and venue features from this draft?\n\nAssignments on cleared chairs will be removed. You can Undo immediately after."
        : "Clear all tables and venue features from this draft?\n\nGuests on cleared tables will be unassigned. You can Undo immediately after.";
    if (!window.confirm(message)) return;

    pushHistory();
    if (planType === "CEREMONY") {
      const clearedRows = ceremonyRows;
      setCeremonyRows([]);
      if (!options?.keepAssignments) {
        setAssignments((current) => {
          const next = { ...current };
          for (const [guestId, assignment] of Object.entries(next)) {
            const onRow = clearedRows.some(
              (row) =>
                tablesMatch(assignment.tableNumber, row.label) ||
                row.chairs.some((chair) => chair.label === assignment.seatLabel)
            );
            if (onRow) {
              delete next[guestId];
              void autoRemoveAssignment(guestId);
            }
          }
          return next;
        });
      }
      setLayout((current) => ({
        ...current,
        ceremonyRows: [],
        elements: [],
        planKind: "CEREMONY",
      }));
    } else {
      const clearedTables = tables;
      setTables([]);
      if (!options?.keepAssignments) {
        setAssignments((current) => {
          const next = { ...current };
          for (const [guestId, assignment] of Object.entries(next)) {
            if (clearedTables.some((table) => tablesMatch(assignment.tableNumber, table.label))) {
              delete next[guestId];
              void autoRemoveAssignment(guestId);
            }
          }
          return next;
        });
        setCompanionHolds([]);
      }
      setLayout((current) => ({
        ...current,
        tables: [],
        elements: [],
        planKind: "RECEPTION",
      }));
    }
    clearCanvasSelection();
    setSaveError(null);
  }

  function clearSelectedRows() {
    if (previewMode || planType !== "CEREMONY" || selectedRowIds.length === 0) return;
    const rows = ceremonyRows.filter((row) => selectedRowIds.includes(row.id));
    if (!rows.length) return;
    const ok = window.confirm(
      `Remove ${rows.length} selected row${rows.length === 1 ? "" : "s"}?\n\nYou can Undo right after.`
    );
    if (!ok) return;
    pushHistory();
    const removeIds = new Set(rows.map((row) => row.id));
    const removeLabels = new Set(rows.map((row) => row.label.toLowerCase()));
    const removeChairs = new Set(
      rows.flatMap((row) => row.chairs.map((chair) => chair.label.toLowerCase()))
    );
    setCeremonyRows((current) => current.filter((row) => !removeIds.has(row.id)));
    setAssignments((current) => {
      const next = { ...current };
      for (const [guestId, assignment] of Object.entries(next)) {
        const onRow =
          removeLabels.has(assignment.tableNumber.toLowerCase()) ||
          (assignment.seatLabel
            ? removeChairs.has(assignment.seatLabel.toLowerCase())
            : false);
        if (onRow) {
          delete next[guestId];
          void autoRemoveAssignment(guestId);
        }
      }
      return next;
    });
    setLayout((current) => ({
      ...current,
      ceremonyRows: (current.ceremonyRows ?? []).filter((row) => !removeIds.has(row.id)),
      planKind: "CEREMONY",
    }));
    clearCanvasSelection();
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
      if (nextStatus === "published") {
        setMapExportNotice(
          "Published. Download the guest venue map PNG to share for navigation on the day."
        );
      }
    } catch {
      setSaveError("Could not save seating studio. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function downloadGuestVenueMap() {
    const isPublished = layout.status === "published";
    if (!isPublished) {
      setSaveError("Publish this seating plan first, then download the guest venue map.");
      return;
    }
    const hasContent =
      planType === "CEREMONY"
        ? ceremonyRows.length > 0 || (layout.elements ?? []).length > 0
        : tables.length > 0 || (layout.elements ?? []).length > 0;
    if (!hasContent) {
      setSaveError("Add rows/tables or venue features before downloading the map.");
      return;
    }
    setMapExporting(true);
    setSaveError(null);
    try {
      const directions =
        planType === "CEREMONY"
          ? settings.ceremonyDirections ?? settings.directionsFromEntrance ?? []
          : settings.receptionDirections ?? settings.directionsFromEntrance ?? [];
      await downloadVenueMapPng({
        planName,
        planType,
        layout: {
          ...layout,
          tables: planType === "RECEPTION" ? tables : [],
          ceremonyRows: planType === "CEREMONY" ? ceremonyRows : layout.ceremonyRows,
          status: "published",
          planKind: planType,
        },
        tables,
        ceremonyRows,
        directions,
        scale: 2,
      });
      setMapExportNotice("Venue map downloaded — share the PNG with guests for easy navigation.");
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not download the venue map image."
      );
    } finally {
      setMapExporting(false);
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
        `Switch to ${next === "CEREMONY" ? "Main Ceremony" : "Reception"}? Unsaved layout edits on this plan stay local until you Save Draft or Publish.`
      );
      if (!ok) return;
    }
    dirtyRef.current = false;
    setPlanType(next);
    setCanvasSelectMode("all");
    setSelectedTableId(null);
    setSelectedElementId(null);
    setSelectedRowIds([]);
    setSelectedSeat(null);
    setSuggestions([]);
    setPast([]);
    setFuture([]);
    await load(false, next);
  }

  function generateCeremony() {
    pushHistory();
    const sections = getCeremonySections(true);
    const needsSeed = !(layout.ceremonySections ?? []).length;
    const rows = generateCeremonyRows({
      rows: ceremonyGen.rows,
      chairsPerRow: ceremonyGen.chairsPerRow,
      aisle: ceremonyGen.aisle,
      naming: "letters",
      sectionId: ceremonyGen.sectionId || sections.find((s) => s.id === "general")?.id || sections[0]?.id,
    });
    setCeremonyRows(rows);
    setSelectedTableId(rows[0]?.id ?? null);
    setSelectedRowIds(rows[0] ? [rows[0].id] : []);
    setLayout((current) => ({
      ...current,
      ceremonyRows: rows,
      ceremonySections: needsSeed ? sections : current.ceremonySections,
      planKind: "CEREMONY",
    }));
    setSaveError(null);
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
    setSelectedTableId((current) => (current === rowId ? null : current));
    setSelectedRowIds((current) => current.filter((id) => id !== rowId));
    setSelectedSeat(null);
    setLayout((current) => ({
      ...current,
      ceremonyRows: (current.ceremonyRows ?? []).filter((item) => item.id !== rowId),
      planKind: "CEREMONY",
    }));
  }

  function selectAllCeremonyRows() {
    if (canvasSelectMode === "features") return;
    const ids = ceremonyRows.map((row) => row.id);
    setSelectedRowIds(ids);
    setSelectedTableId(ids[0] ?? null);
    setSelectedElementId(null);
    setSelectedSeat(null);
  }

  function clearRowSelection() {
    setSelectedRowIds([]);
    setSelectedTableId(null);
    setSelectedSeat(null);
  }

  function getCeremonySections(seedIfEmpty = true): CeremonySection[] {
    const existing = layout.ceremonySections ?? [];
    if (existing.length > 0 || !seedIfEmpty) return existing;
    return defaultCeremonySections();
  }

  function applyHighlightToRows(rowIds: string[], sectionId: string | null) {
    if (previewMode || planType !== "CEREMONY" || rowIds.length === 0) return;
    const sections = getCeremonySections(true);
    const needsSeed = !(layout.ceremonySections ?? []).length;
    const section = sectionId ? sections.find((item) => item.id === sectionId) : null;
    if (sectionId && !section) return;
    pushHistory();
    const idSet = new Set(rowIds);
    const nextRows = ceremonyRows.map((row) =>
      idSet.has(row.id) ? { ...row, sectionId: section?.id ?? undefined } : row
    );
    setCeremonyRows(nextRows);
    if (section) {
      setAssignments((current) => {
        const next = { ...current };
        const targetRows = ceremonyRows.filter((row) => idSet.has(row.id));
        for (const [guestId, assignment] of Object.entries(next)) {
          const onRow = targetRows.some(
            (row) =>
              tablesMatch(assignment.tableNumber, row.label) ||
              row.chairs.some((chair) => chair.label === assignment.seatLabel)
          );
          if (onRow) next[guestId] = { ...assignment, zone: section.name };
        }
        return next;
      });
    }
    setLayout((current) => ({
      ...current,
      ceremonyRows: nextRows,
      ceremonySections: needsSeed ? sections : current.ceremonySections,
      zones: needsSeed
        ? [
            ...(current.zones ?? []).filter(
              (zone) => !sections.some((item) => item.name === zone.name)
            ),
            ...sections.map((item) => ({
              id: `z-${item.id}`,
              name: item.name,
              color: item.color,
            })),
          ]
        : current.zones,
      planKind: "CEREMONY",
    }));
    setCeremonyGen((current) => ({ ...current, sectionId: section?.id ?? "" }));
  }

  function addCeremonyRow() {
    pushHistory();
    const sections = getCeremonySections(true);
    const needsSeed = !(layout.ceremonySections ?? []).length;
    const nextIndex = ceremonyRows.length;
    const sectionId = ceremonyGen.sectionId || undefined;
    const anchor =
      selectedRowIds.length > 0
        ? ceremonyRows.find((row) => row.id === selectedRowIds[selectedRowIds.length - 1])
        : selectedCeremonyRow;
    const startY = anchor ? (anchor.y ?? 40) + 72 : 40 + nextIndex * 72;
    const relabeled = generateCeremonyRows({
      rows: ceremonyRows.length + 1,
      chairsPerRow: ceremonyGen.chairsPerRow,
      aisle: ceremonyGen.aisle,
      naming: "letters",
      sectionId: sectionId || sections.find((s) => s.id === "general")?.id || sections[0]?.id,
      startY,
    });
    const appended = relabeled[relabeled.length - 1]!;
    const resolvedSectionId = sectionId || appended.sectionId;
    const nextRow = {
      ...appended,
      sectionId: resolvedSectionId,
      x: anchor?.x ?? 40,
      y: startY,
      chairs: appended.chairs.map((chair) => ({
        ...chair,
        y: startY,
        x: (chair.x ?? 40) - (appended.x ?? 40) + (anchor?.x ?? 40),
      })),
    };
    const insertAt = anchor
      ? ceremonyRows.findIndex((row) => row.id === anchor.id) + 1
      : ceremonyRows.length;
    const next = [...ceremonyRows.slice(0, insertAt), nextRow, ...ceremonyRows.slice(insertAt)];
    setCeremonyRows(next);
    setSelectedTableId(nextRow.id);
    setSelectedRowIds([nextRow.id]);
    setLayout((current) => ({
      ...current,
      ceremonyRows: next,
      ceremonySections: needsSeed ? sections : current.ceremonySections,
      planKind: "CEREMONY",
    }));
  }

  function addCeremonySection() {
    createCeremonyZone({
      name: `Zone ${(layout.ceremonySections ?? []).length + 1}`,
      color: VENUE_FEATURE_COLOR_PRESETS[
        (layout.ceremonySections ?? []).length % VENUE_FEATURE_COLOR_PRESETS.length
      ]!,
    });
  }

  function createCeremonyZone(input: { name: string; color: string }) {
    const name = input.name.trim();
    if (!name) return;
    pushHistory();
    const baseSections = layout.ceremonySections ?? [];
    const section = {
      id: `section-${Date.now()}`,
      name,
      color: input.color,
      side: "custom" as const,
      priority: 3,
    };
    const ids = [...selectedRowIds];
    const nextRows =
      ids.length > 0
        ? ceremonyRows.map((row) =>
            ids.includes(row.id) ? { ...row, sectionId: section.id } : row
          )
        : ceremonyRows;
    if (ids.length > 0) setCeremonyRows(nextRows);
    setLayout((current) => ({
      ...current,
      ceremonyRows: ids.length > 0 ? nextRows : current.ceremonyRows,
      ceremonySections: [...baseSections, section],
      zones: [
        ...(current.zones ?? []),
        { id: `z-${section.id}`, name: section.name, color: section.color },
      ],
      planKind: "CEREMONY",
    }));
    setCeremonyGen((current) => ({ ...current, sectionId: section.id }));
  }

  function updateCeremonyZone(zoneId: string, patch: { name?: string; color?: string }) {
    const current = (layout.ceremonySections ?? []).find((section) => section.id === zoneId);
    if (!current) return;
    const nextName = patch.name?.trim() || current.name;
    const nextColor = patch.color || current.color;
    if (nextName === current.name && nextColor === current.color) return;
    pushHistory();
    setLayout((layoutCurrent) => ({
      ...layoutCurrent,
      ceremonySections: (layoutCurrent.ceremonySections ?? []).map((section) =>
        section.id === zoneId ? { ...section, name: nextName, color: nextColor } : section
      ),
      zones: (layoutCurrent.zones ?? []).map((zone) =>
        zone.name === current.name || zone.id === `z-${zoneId}`
          ? { ...zone, name: nextName, color: nextColor }
          : zone
      ),
      planKind: "CEREMONY",
    }));
    if (nextName !== current.name) {
      setAssignments((assignmentCurrent) => {
        const next = { ...assignmentCurrent };
        for (const [guestId, assignment] of Object.entries(next)) {
          if (assignment.zone === current.name) {
            next[guestId] = { ...assignment, zone: nextName };
          }
        }
        return next;
      });
    }
  }

  function deleteCeremonyZone(zoneId: string) {
    const current = (layout.ceremonySections ?? []).find((section) => section.id === zoneId);
    if (!current) return;
    pushHistory();
    setCeremonyRows((rows) =>
      rows.map((row) => (row.sectionId === zoneId ? { ...row, sectionId: undefined } : row))
    );
    setLayout((layoutCurrent) => ({
      ...layoutCurrent,
      ceremonyRows: (layoutCurrent.ceremonyRows ?? []).map((row) =>
        row.sectionId === zoneId ? { ...row, sectionId: undefined } : row
      ),
      ceremonySections: (layoutCurrent.ceremonySections ?? []).filter(
        (section) => section.id !== zoneId
      ),
      zones: (layoutCurrent.zones ?? []).filter(
        (zone) => zone.name !== current.name && zone.id !== `z-${zoneId}`
      ),
      planKind: "CEREMONY",
    }));
    setCeremonyGen((gen) =>
      gen.sectionId === zoneId ? { ...gen, sectionId: "" } : gen
    );
  }

  function createReceptionZone(input: { name: string; color: string }) {
    const name = input.name.trim();
    if (!name) return;
    if ((layout.zones ?? []).some((zone) => zone.name.toLowerCase() === name.toLowerCase())) {
      setSaveError(`Zone “${name}” already exists.`);
      return;
    }
    pushHistory();
    setLayout((current) => ({
      ...current,
      zones: [...(current.zones ?? []), { id: `z-${Date.now()}`, name, color: input.color }],
    }));
    setSaveError(null);
  }

  function updateReceptionZone(zoneId: string, patch: { name?: string; color?: string }) {
    const current = (layout.zones ?? []).find((zone) => zone.id === zoneId);
    if (!current) return;
    const nextName = patch.name?.trim() || current.name;
    const nextColor = patch.color || current.color;
    if (nextName === current.name && nextColor === current.color) return;
    pushHistory();
    setLayout((layoutCurrent) => ({
      ...layoutCurrent,
      zones: (layoutCurrent.zones ?? []).map((zone) =>
        zone.id === zoneId ? { ...zone, name: nextName, color: nextColor } : zone
      ),
    }));
    if (nextName !== current.name) {
      setTables((tablesCurrent) =>
        tablesCurrent.map((table) =>
          table.zone === current.name ? { ...table, zone: nextName } : table
        )
      );
      setAssignments((assignmentCurrent) => {
        const next = { ...assignmentCurrent };
        for (const [guestId, assignment] of Object.entries(next)) {
          if (assignment.zone === current.name) {
            next[guestId] = { ...assignment, zone: nextName };
          }
        }
        return next;
      });
    }
  }

  function deleteReceptionZone(zoneId: string) {
    const current = (layout.zones ?? []).find((zone) => zone.id === zoneId);
    if (!current) return;
    pushHistory();
    setLayout((layoutCurrent) => ({
      ...layoutCurrent,
      zones: (layoutCurrent.zones ?? []).filter((zone) => zone.id !== zoneId),
    }));
    setTables((tablesCurrent) =>
      tablesCurrent.map((table) =>
        table.zone === current.name ? { ...table, zone: undefined } : table
      )
    );
  }

  function addCustomVenueFeature() {
    const label = customVenueLabel.trim() || "Custom feature";
    pushHistory();
    const count = layout.elements?.length ?? 0;
    const element: StudioVenueElement = {
      id: `el-${Date.now()}`,
      kind: "custom",
      label,
      x: 40 + (count % 4) * 140,
      y: 40 + Math.floor(count / 4) * 90,
      width: 120,
      height: 72,
      color: customVenueColor,
      rotation: 0,
    };
    setLayout((current) => ({
      ...current,
      elements: [...(current.elements ?? []), element],
    }));
    selectElement(element.id);
    setCustomVenueLabel("");
  }

  function autoGenerateTables() {
    if (previewMode) return;
    const seatsPerTable = 8;
    const expected = peopleStats.expectedPeople;
    const usingStarter = expected <= 0;
    const peopleForPlan = usingStarter ? 32 : expected; // 4 starter tables when guest count unknown
    const plan = requiredTablesForPeople(peopleForPlan, seatsPerTable);
    if (plan.tables <= 0) {
      setSaveError("Could not generate tables — try Add Table instead.");
      return;
    }
    if (tables.length > 0) {
      const ok = window.confirm(
        `Replace the current ${tables.length} table(s) with ${plan.tables} round tables of ${seatsPerTable} for ${
          usingStarter ? "a starter floor plan" : `${expected} expected people`
        }?`
      );
      if (!ok) return;
    }
    pushHistory();
    if (canvasSelectMode === "features") setCanvasSelectMode("all");
    const stamp = Date.now();
    const next = Array.from({ length: plan.tables }, (_, index) => {
      const pos = defaultTablePosition(index, settings.gridSize);
      return normalizeStudioTable({
        id: `t-gen-${stamp}-${index}`,
        label: normalizeTableName(`Table ${index + 1}`),
        kind: "round",
        shape: "round",
        seatCount: seatsPerTable,
        capacity: seatsPerTable,
        x: pos.x,
        y: pos.y,
      });
    });
    setTables(next);
    setAssignments({});
    setCompanionHolds([]);
    setSelectedTableId(next[0]?.id ?? null);
    setSelectedElementId(null);
    setSelectedSeat(null);
    setLayout((current) => ({
      ...current,
      tables: next,
      planKind: "RECEPTION",
      expectedGuests: usingStarter ? peopleForPlan : expected,
    }));
    setSaveError(null);
    if (usingStarter) {
      setMapExportNotice(
        `Starter reception layout ready — ${plan.tables} tables of ${seatsPerTable}. Add guests anytime; regenerate to match headcount.`
      );
    }
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
    selectTable(null);
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

  function addTable(kind: StudioTableKind = "round", position?: { x: number; y: number }) {
    if (previewMode) return;
    pushHistory();
    if (canvasSelectMode === "features") setCanvasSelectMode("all");
    const preset = TABLE_KIND_PRESETS[kind];
    const index = tables.length;
    const pos = position ?? defaultTablePosition(index, settings.gridSize);
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
    setLayout((current) => ({
      ...current,
      tables: [...(current.tables ?? []).filter((item) => item.id !== table.id), table],
      planKind: "RECEPTION",
    }));
    setSelectedElementId(null);
    setSelectedSeat(null);
    setSelectedTableId(table.id);
    setSaveError(null);
  }

  function addVenueElement(
    kind: VenueElementKind,
    label: string,
    position?: { x: number; y: number }
  ) {
    pushHistory();
    const count = layout.elements?.length ?? 0;
    const size = venueElementSize(kind);
    const preset = venueFeaturePreset(kind);
    const element: StudioVenueElement = {
      id: `el-${Date.now()}`,
      kind,
      label,
      x: position?.x ?? 40 + (count % 4) * 140,
      y: position?.y ?? 40 + Math.floor(count / 4) * 90,
      width: size.width,
      height: size.height,
      color: preset.color,
      rotation: 0,
    };
    setLayout((current) => ({
      ...current,
      elements: [...(current.elements ?? []), element],
    }));
    selectElement(element.id);
  }

  function removeVenueElement(elementId: string) {
    pushHistory();
    setLayout((current) => ({
      ...current,
      elements: (current.elements ?? []).filter((element) => element.id !== elementId),
    }));
    if (selectedElementId === elementId) setSelectedElementId(null);
  }

  function renameSelectedElement(nextLabel: string) {
    if (!selectedElement) return;
    const label = nextLabel.trim();
    if (!label || label === selectedElement.label) return;
    pushHistory();
    setLayout((current) => ({
      ...current,
      elements: (current.elements ?? []).map((element) =>
        element.id === selectedElement.id ? { ...element, label } : element
      ),
    }));
  }

  function updateSelectedElement(patch: Partial<StudioVenueElement>) {
    if (!selectedElement) return;
    pushHistory();
    setLayout((current) => ({
      ...current,
      elements: (current.elements ?? []).map((element) =>
        element.id === selectedElement.id ? { ...element, ...patch } : element
      ),
    }));
  }

  function rotateVenueElement(elementId: string, deltaDegrees: number, absolute?: number) {
    rotateCanvasItem("element", elementId, deltaDegrees, absolute);
  }

  function rotateCanvasItem(
    kind: "element" | "table" | "row",
    id: string,
    deltaDegrees: number,
    absolute?: number,
    options?: { history?: boolean }
  ) {
    if (previewMode) return;
    const withHistory = options?.history !== false;
    if (kind === "element") {
      const current = (layout.elements ?? []).find((element) => element.id === id);
      if (!current || current.locked) return;
      if (withHistory) pushHistory();
      else dirtyRef.current = true;
      const nextRotation =
        absolute !== undefined
          ? normalizeRotationDegrees(absolute)
          : normalizeRotationDegrees((current.rotation ?? 0) + deltaDegrees);
      setLayout((layoutCurrent) => ({
        ...layoutCurrent,
        elements: (layoutCurrent.elements ?? []).map((element) =>
          element.id === id ? { ...element, rotation: nextRotation } : element
        ),
      }));
      return;
    }
    if (kind === "table") {
      const current = tables.find((table) => table.id === id);
      if (!current || current.locked) return;
      if (withHistory) pushHistory();
      else dirtyRef.current = true;
      const nextRotation =
        absolute !== undefined
          ? normalizeRotationDegrees(absolute)
          : normalizeRotationDegrees((current.rotation ?? 0) + deltaDegrees);
      setTables((currentTables) =>
        currentTables.map((table) =>
          table.id === id ? { ...table, rotation: nextRotation } : table
        )
      );
      return;
    }
    const current = ceremonyRows.find((row) => row.id === id);
    if (!current || current.locked) return;
    if (withHistory) pushHistory();
    else dirtyRef.current = true;
    const nextRotation =
      absolute !== undefined
        ? normalizeRotationDegrees(absolute)
        : normalizeRotationDegrees((current.rotation ?? 0) + deltaDegrees);
    setCeremonyRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, rotation: nextRotation } : row))
    );
    setLayout((layoutCurrent) => ({
      ...layoutCurrent,
      ceremonyRows: (layoutCurrent.ceremonyRows ?? []).map((row) =>
        row.id === id ? { ...row, rotation: nextRotation } : row
      ),
      planKind: "CEREMONY",
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

  useEffect(() => {
    if (canvasSelectMode === "features") {
      setSelectedTableId(null);
      setSelectedRowIds([]);
      setSelectedSeat(null);
    } else if (canvasSelectMode === "rows") {
      setSelectedElementId(null);
    }
  }, [canvasSelectMode]);

  useEffect(() => {
    if (previewMode) return;
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }
      if (event.key === "Escape" && isFullscreen && !document.fullscreenElement) {
        event.preventDefault();
        setIsFullscreen(false);
        setFullscreenChromeOpen(false);
        return;
      }
      const rotateTarget =
        selectedElementId && canInteractWithFeatures()
          ? ({ kind: "element" as const, id: selectedElementId })
          : selectedTable && planType === "RECEPTION" && canInteractWithRows() && !selectedTable.locked
            ? ({ kind: "table" as const, id: selectedTable.id })
            : selectedCeremonyRow &&
                planType === "CEREMONY" &&
                canInteractWithRows() &&
                !selectedCeremonyRow.locked
              ? ({ kind: "row" as const, id: selectedCeremonyRow.id })
              : null;
      if (rotateTarget) {
        if (event.key === "[" || event.key.toLowerCase() === "q") {
          event.preventDefault();
          rotateCanvasItem(rotateTarget.kind, rotateTarget.id, event.shiftKey ? -90 : -15);
          return;
        }
        if (event.key === "]" || event.key.toLowerCase() === "e") {
          event.preventDefault();
          rotateCanvasItem(rotateTarget.kind, rotateTarget.id, event.shiftKey ? 90 : 15);
          return;
        }
        if (event.key.toLowerCase() === "r" && !event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          rotateCanvasItem(rotateTarget.kind, rotateTarget.id, 0, 0);
          return;
        }
      }
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (selectedElementId && canInteractWithFeatures()) {
        event.preventDefault();
        removeVenueElement(selectedElementId);
        return;
      }
      if (planType === "CEREMONY" && selectedRowIds.length > 0 && canInteractWithRows()) {
        event.preventDefault();
        clearSelectedRows();
        return;
      }
      if (selectedTable && planType === "RECEPTION" && canInteractWithRows()) {
        event.preventDefault();
        deleteSelectedTable();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // Intentionally bound to selection identity only — handlers close over latest render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selection-driven shortcut
  }, [previewMode, selectedElementId, selectedTable?.id, selectedRowIds.join(","), planType, canvasSelectMode, isFullscreen]);

  const hasCanvasContent =
    planType === "CEREMONY"
      ? ceremonyRows.length > 0 || (layout.elements ?? []).length > 0
      : tables.length > 0 || (layout.elements ?? []).length > 0;
  const hasStagedCanvasEdits = past.length > 0;

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
      {mapExportNotice && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#0B8A83]/25 bg-[#0B8A83]/5 px-4 py-3 text-sm text-slate-800">
          <p>{mapExportNotice}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="bg-[#0B8A83] hover:bg-[#097a74]"
              disabled={mapExporting || layout.status !== "published"}
              onClick={() => void downloadGuestVenueMap()}
            >
              <Download className="h-4 w-4" />
              {mapExporting ? "Preparing…" : "Download guest map"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setMapExportNotice(null)}>
              Dismiss
            </Button>
          </div>
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
                <Plus className="h-4 w-4" /> New Zone
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
          <Button
            variant="outline"
            size="sm"
            className="border-rose-200 text-rose-700 hover:bg-rose-50"
            onClick={() => clearAllCanvas()}
            disabled={!hasCanvasContent || previewMode}
            title="Clear canvas — Undo restores the previous draft state"
          >
            <Eraser className="h-4 w-4" /> Clear All
          </Button>
          {hasStagedCanvasEdits && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
              Staged edits — Undo or Clear All
            </Badge>
          )}
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
          <Button
            variant="outline"
            disabled={mapExporting || previewMode || layout.status !== "published"}
            title={
              layout.status === "published"
                ? "Download a guest-ready venue map PNG"
                : "Publish the plan first to unlock the guest map download"
            }
            onClick={() => void downloadGuestVenueMap()}
          >
            <Download className="h-4 w-4" />
            {mapExporting ? "Preparing map…" : "Download map"}
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

      <div
        ref={studioWorkspaceRef}
        className={cn(
          "relative",
          isFullscreen
            ? "fixed inset-0 z-[100] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#0F172A]"
            : "grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]"
        )}
      >
        {isFullscreen && (
          <>
            {/* Immersive tools drawer — hidden until pulled/tapped */}
            <div
              className={cn(
                "absolute inset-x-0 top-0 z-[70] transition-transform duration-300 ease-out",
                fullscreenChromeOpen ? "translate-y-0" : "-translate-y-[calc(100%-2.75rem)]"
              )}
              onPointerDown={(event) => {
                const target = event.target as HTMLElement;
                if (!target.closest("[data-chrome-handle]")) return;
                chromeSwipeRef.current = {
                  startY: event.clientY,
                  opened: fullscreenChromeOpen,
                };
                try {
                  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
                } catch {
                  /* ignore */
                }
              }}
              onPointerMove={(event) => {
                const swipe = chromeSwipeRef.current;
                if (!swipe) return;
                const dy = event.clientY - swipe.startY;
                if (!swipe.opened && dy > 48) {
                  setFullscreenChromeOpen(true);
                  chromeSwipeRef.current = { ...swipe, opened: true, startY: event.clientY };
                } else if (swipe.opened && dy < -48) {
                  setFullscreenChromeOpen(false);
                  chromeSwipeRef.current = { ...swipe, opened: false, startY: event.clientY };
                }
              }}
              onPointerUp={() => {
                chromeSwipeRef.current = null;
              }}
              onPointerCancel={() => {
                chromeSwipeRef.current = null;
              }}
            >
              <div className="mx-auto max-h-[min(52vh,420px)] overflow-y-auto rounded-b-2xl border border-white/10 bg-slate-950/95 px-3 pb-2 pt-3 text-white shadow-2xl backdrop-blur-md">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold tracking-wide text-white/90">
                    {seatingPlanDisplayName(planType)} tools
                  </p>
                  <div className="ml-auto flex flex-wrap items-center gap-1">
                    <span className="mr-1 text-[11px] tabular-nums text-white/60">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 border-white/20 bg-white/5 text-white hover:bg-white/10"
                      onClick={() => zoomBy(0.1)}
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 border-white/20 bg-white/5 text-white hover:bg-white/10"
                      onClick={() => zoomBy(-0.1)}
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 border-white/20 bg-white/5 text-white hover:bg-white/10"
                      onClick={resetCanvasView}
                    >
                      <Focus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 bg-[#0B8A83] hover:bg-[#097a74]"
                      onClick={() => void toggleStudioFullscreen()}
                    >
                      <Minimize2 className="h-3.5 w-3.5" /> Exit
                    </Button>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: "all" as const, label: "All", icon: SquareStack },
                      {
                        id: "rows" as const,
                        label: planType === "CEREMONY" ? "Rows" : "Tables",
                        icon: planType === "CEREMONY" ? Rows3 : LayoutGrid,
                      },
                      { id: "features" as const, label: "Features", icon: MapPin },
                    ] as const
                  ).map((mode) => {
                    const Icon = mode.icon;
                    const active = canvasSelectMode === mode.id;
                    return (
                      <Button
                        key={mode.id}
                        type="button"
                        size="sm"
                        variant={active ? "default" : "outline"}
                        className={cn(
                          "h-8 gap-1.5 border-white/20",
                          active
                            ? "bg-[#0B8A83] hover:bg-[#097a74]"
                            : "bg-white/5 text-white hover:bg-white/10"
                        )}
                        onClick={() => setCanvasSelectMode(mode.id)}
                      >
                        <Icon className="h-3.5 w-3.5" /> {mode.label}
                      </Button>
                    );
                  })}
                  {planType === "CEREMONY" ? (
                    <>
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 bg-[#0B8A83]"
                        disabled={previewMode}
                        onClick={generateCeremony}
                      >
                        <Wand2 className="h-3.5 w-3.5" /> Auto rows
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 border-white/20 bg-white/5 text-white"
                        disabled={previewMode}
                        onClick={addCeremonyRow}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add row
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 border-white/20 bg-white/5 text-white"
                        disabled={previewMode}
                        onClick={addCeremonySection}
                      >
                        <Plus className="h-3.5 w-3.5" /> New zone
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 bg-[#0B8A83]"
                        disabled={previewMode}
                        onClick={autoGenerateTables}
                      >
                        <Wand2 className="h-3.5 w-3.5" /> Auto tables
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5 border-white/20 bg-white/5 text-white"
                        disabled={previewMode}
                        onClick={() => addTable("round")}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add table
                      </Button>
                    </>
                  )}
                </div>

                <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                  {VENUE_FEATURE_PRESETS.map((preset) => (
                    <button
                      key={`fs-${preset.kind}`}
                      type="button"
                      disabled={previewMode}
                      title={preset.hint}
                      className="h-16 w-28 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-white text-left shadow-sm"
                      onClick={() => addVenueElement(preset.kind, preset.label)}
                    >
                      <VenueFeatureVisual
                        kind={preset.kind}
                        label={preset.label}
                        color={preset.color}
                        variant="palette"
                      />
                    </button>
                  ))}
                </div>

                {(selectedElement || selectedTable || selectedCeremonyRow) && !previewMode && (
                  <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                      Rotate
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-white/20 bg-white/5 text-white"
                      onClick={() => {
                        if (selectedElement) rotateCanvasItem("element", selectedElement.id, -15);
                        else if (selectedTable) rotateCanvasItem("table", selectedTable.id, -15);
                        else if (selectedCeremonyRow)
                          rotateCanvasItem("row", selectedCeremonyRow.id, -15);
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> −15°
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-white/20 bg-white/5 text-white"
                      onClick={() => {
                        if (selectedElement) rotateCanvasItem("element", selectedElement.id, 15);
                        else if (selectedTable) rotateCanvasItem("table", selectedTable.id, 15);
                        else if (selectedCeremonyRow)
                          rotateCanvasItem("row", selectedCeremonyRow.id, 15);
                      }}
                    >
                      <RotateCw className="h-3.5 w-3.5" /> +15°
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-white/20 bg-white/5 text-white"
                      onClick={() => {
                        if (selectedElement) rotateCanvasItem("element", selectedElement.id, 90);
                        else if (selectedTable) rotateCanvasItem("table", selectedTable.id, 90);
                        else if (selectedCeremonyRow)
                          rotateCanvasItem("row", selectedCeremonyRow.id, 90);
                      }}
                    >
                      +90°
                    </Button>
                    <span className="text-xs tabular-nums text-white/80">
                      {Math.round(
                        selectedElement?.rotation ??
                          selectedTable?.rotation ??
                          selectedCeremonyRow?.rotation ??
                          0
                      )}
                      °
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={359}
                      step={1}
                      value={Math.round(
                        selectedElement?.rotation ??
                          selectedTable?.rotation ??
                          selectedCeremonyRow?.rotation ??
                          0
                      )}
                      className="h-8 min-w-[140px] flex-1 accent-[#0B8A83]"
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (selectedElement)
                          rotateCanvasItem("element", selectedElement.id, 0, value, {
                            history: false,
                          });
                        else if (selectedTable)
                          rotateCanvasItem("table", selectedTable.id, 0, value, {
                            history: false,
                          });
                        else if (selectedCeremonyRow)
                          rotateCanvasItem("row", selectedCeremonyRow.id, 0, value, {
                            history: false,
                          });
                      }}
                      onPointerDown={() => {
                        if (selectedElement || selectedTable || selectedCeremonyRow) pushHistory();
                      }}
                    />
                  </div>
                )}

                <button
                  type="button"
                  data-chrome-handle
                  className="mx-auto mt-1 flex w-full max-w-sm flex-col items-center gap-1 rounded-xl px-3 py-2 text-white/80 hover:bg-white/5"
                  onClick={() => setFullscreenChromeOpen((open) => !open)}
                >
                  <span className="h-1 w-12 rounded-full bg-white/40" />
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.16em]">
                    {fullscreenChromeOpen ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" /> Hide tools
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" /> Tools & features
                      </>
                    )}
                  </span>
                </button>
              </div>
            </div>
          </>
        )}

        <div
          className={cn(
            "space-y-4",
            isFullscreen && "hidden"
          )}
        >
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
                <div className="space-y-2">
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Drag a table onto the canvas, or tap to place. Select any item to rename or
                    delete it in the inspector.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(TABLE_KIND_PRESETS) as StudioTableKind[]).slice(0, 8).map((kind) => (
                      <Button
                        key={kind}
                        size="sm"
                        variant="outline"
                        disabled={previewMode}
                        draggable={!previewMode}
                        className="cursor-grab active:cursor-grabbing"
                        onDragStart={(event) => beginPaletteDrag(event, { type: "table", kind })}
                        onClick={() => addTable(kind)}
                      >
                        <GripVertical className="h-3.5 w-3.5 opacity-50" />
                        {TABLE_KIND_PRESETS[kind].label}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <ZoneManager
                    title="Row zones"
                    hint="Create, rename, recolour, or delete zones. With rows selected, tap a zone to highlight them (Reserved / Family / Special Guests, or your own)."
                    zones={(layout.ceremonySections ?? []).map((section) => ({
                      id: section.id,
                      name: section.name,
                      color: section.color,
                    }))}
                    previewMode={previewMode}
                    activeZoneId={ceremonyGen.sectionId || null}
                    onSelect={(zoneId) => {
                      if (selectedRowIds.length > 0) {
                        applyHighlightToRows(selectedRowIds, zoneId);
                        return;
                      }
                      setCeremonyGen((current) => ({ ...current, sectionId: zoneId }));
                    }}
                    onCreate={createCeremonyZone}
                    onUpdate={updateCeremonyZone}
                    onDelete={deleteCeremonyZone}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={previewMode || ceremonyRows.length === 0}
                      onClick={selectAllCeremonyRows}
                    >
                      Select all rows
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={previewMode || selectedRowIds.length === 0}
                      onClick={clearRowSelection}
                    >
                      Clear selection
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={previewMode}
                      onClick={addCeremonyRow}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add row
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50"
                      disabled={previewMode || selectedRowIds.length === 0}
                      onClick={clearSelectedRows}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete selected
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-slate-600"
                      disabled={previewMode || selectedRowIds.length === 0}
                      onClick={() => applyHighlightToRows(selectedRowIds, null)}
                    >
                      Clear highlight
                    </Button>
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

          {planType === "RECEPTION" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Zones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Quick presets, or create your own zone and edit or delete anytime.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ZONE_PRESETS.slice(0, 6).map((zone) => (
                    <Button
                      key={zone.name}
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={previewMode}
                      onClick={() => createReceptionZone({ name: zone.name, color: zone.color })}
                    >
                      <span
                        className="mr-1.5 h-2.5 w-2.5 rounded-full"
                        style={{ background: zone.color }}
                      />
                      {zone.name}
                    </Button>
                  ))}
                </div>
                <ZoneManager
                  title="Your zones"
                  zones={(layout.zones ?? []).map((zone) => ({
                    id: zone.id,
                    name: zone.name,
                    color: zone.color,
                  }))}
                  previewMode={previewMode}
                  onCreate={createReceptionZone}
                  onUpdate={updateReceptionZone}
                  onDelete={deleteReceptionZone}
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Venue features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-[11px] leading-relaxed text-slate-500">
                Drag map markers onto the floor plan, or add a custom feature. Select a placed
                marker to rotate (top handle or ±15°), resize, recolour, or delete.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {VENUE_FEATURE_PRESETS.map((preset) => (
                  <button
                    key={preset.kind}
                    type="button"
                    disabled={previewMode}
                    draggable={!previewMode}
                    title={preset.hint}
                    className={cn(
                      "group flex h-[72px] flex-col overflow-hidden rounded-xl border border-[#0B8A83]/25 bg-white text-left shadow-sm transition",
                      "hover:border-[#0B8A83]/55 hover:shadow-md",
                      "cursor-grab active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                    onDragStart={(event) =>
                      beginPaletteDrag(event, {
                        type: "element",
                        kind: preset.kind,
                        label: preset.label,
                      })
                    }
                    onClick={() => addVenueElement(preset.kind, preset.label)}
                  >
                    <VenueFeatureVisual
                      kind={preset.kind}
                      label={preset.label}
                      color={preset.color}
                      variant="palette"
                    />
                  </button>
                ))}
              </div>

              <div className="space-y-2 rounded-xl border border-dashed border-[#0B8A83]/30 bg-[#0B8A83]/5 p-3">
                <p className="text-xs font-semibold text-slate-700">Custom feature</p>
                <Input
                  value={customVenueLabel}
                  disabled={previewMode}
                  placeholder="Name — e.g. Coat check"
                  onChange={(event) => setCustomVenueLabel(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustomVenueFeature();
                    }
                  }}
                />
                <div className="flex flex-wrap gap-1.5">
                  {VENUE_FEATURE_COLOR_PRESETS.slice(0, 8).map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      disabled={previewMode}
                      className={cn(
                        "h-6 w-6 rounded-full border-2",
                        customVenueColor === swatch
                          ? "scale-110 border-slate-900"
                          : "border-white ring-1 ring-slate-200"
                      )}
                      style={{ background: swatch }}
                      onClick={() => setCustomVenueColor(swatch)}
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="w-full bg-[#0B8A83]"
                  disabled={previewMode}
                  onClick={addCustomVenueFeature}
                >
                  <Plus className="h-3.5 w-3.5" /> Add custom feature
                </Button>
              </div>

              {(layout.elements ?? []).length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    On the map
                  </p>
                  {(layout.elements ?? []).map((element) => {
                    const active = selectedElementId === element.id;
                    return (
                      <div
                        key={element.id}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-2 py-1.5",
                          active
                            ? "border-[#0B8A83] bg-[#0B8A83]/10"
                            : "border-slate-200 bg-white"
                        )}
                      >
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          disabled={previewMode}
                          onClick={() => selectElement(element.id)}
                        >
                          <span className="block truncate text-sm font-medium text-slate-800">
                            {element.label}
                          </span>
                          <span className="text-[10px] capitalize text-slate-500">
                            {element.kind.replace(/_/g, " ")}
                          </span>
                        </button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                          disabled={previewMode}
                          title="Delete feature"
                          onClick={() => removeVenueElement(element.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedElement && !previewMode && (
            <VenueFeatureInspector
              element={selectedElement}
              previewMode={previewMode}
              variant="drawer"
              className="hidden lg:flex"
              onRename={renameSelectedElement}
              onUpdate={updateSelectedElement}
              onDelete={() => removeVenueElement(selectedElement.id)}
            />
          )}

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
                  <Label>Highlight zone</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {(layout.ceremonySections ?? []).map((section) => {
                      const active = selectedCeremonyRow.sectionId === section.id;
                      return (
                        <button
                          key={section.id}
                          type="button"
                          disabled={previewMode}
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                            active ? "text-white shadow-sm" : "border border-slate-200 bg-white text-slate-700"
                          )}
                          style={active ? { background: section.color } : undefined}
                          onClick={() =>
                            applyHighlightToRows(
                              selectedRowIds.length > 1 ? selectedRowIds : [selectedCeremonyRow.id],
                              section.id
                            )
                          }
                        >
                          {!active && (
                            <span
                              className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                              style={{ background: section.color }}
                            />
                          )}
                          {section.name}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      disabled={previewMode}
                      className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-500"
                      onClick={() =>
                        applyHighlightToRows(
                          selectedRowIds.length > 1 ? selectedRowIds : [selectedCeremonyRow.id],
                          null
                        )
                      }
                    >
                      None
                    </button>
                  </div>
                  {selectedRowIds.length > 1 && (
                    <p className="text-[11px] text-slate-500">
                      Applying to all {selectedRowIds.length} selected rows.
                    </p>
                  )}
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

        <div
          className={cn(
            "space-y-3",
            isFullscreen && "relative flex min-h-0 w-full flex-1 flex-col"
          )}
        >
          <div
            className={cn(
              "flex flex-wrap items-center gap-2",
              isFullscreen && "hidden"
            )}
          >
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
            <div className="inline-flex rounded-xl border bg-slate-50 p-1">
              {(
                [
                  { id: "all" as const, label: "All", icon: SquareStack },
                  {
                    id: "rows" as const,
                    label: planType === "CEREMONY" ? "Rows" : "Tables",
                    icon: planType === "CEREMONY" ? Rows3 : LayoutGrid,
                  },
                  { id: "features" as const, label: "Features", icon: MapPin },
                ] as const
              ).map((mode) => {
                const Icon = mode.icon;
                const active = canvasSelectMode === mode.id;
                return (
                  <Button
                    key={mode.id}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "ghost"}
                    className={cn("h-8 gap-1.5 px-2.5", active && "bg-[#0B8A83] hover:bg-[#097a74]")}
                    disabled={previewMode}
                    aria-pressed={active}
                    title={`Select ${mode.label.toLowerCase()} only`}
                    onClick={() => setCanvasSelectMode(mode.id)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{mode.label}</span>
                  </Button>
                );
              })}
            </div>
            {planType === "CEREMONY" && selectedRowIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-500">
                  {selectedRowIds.length} selected
                </span>
                {(layout.ceremonySections ?? []).slice(0, 6).map((section) => (
                  <button
                    key={`bar-${section.id}`}
                    type="button"
                    disabled={previewMode}
                    title={`Mark as ${section.name}`}
                    className="h-7 rounded-full px-2.5 text-[11px] font-semibold text-white shadow-sm"
                    style={{ background: section.color }}
                    onClick={() => applyHighlightToRows(selectedRowIds, section.id)}
                  >
                    {section.name}
                  </button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7"
                  disabled={previewMode}
                  onClick={addCeremonyRow}
                >
                  <Plus className="h-3.5 w-3.5" /> Add after
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 border-rose-200 text-rose-700 hover:bg-rose-50"
                  disabled={previewMode}
                  onClick={clearSelectedRows}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            )}
            <div className="ml-auto flex flex-wrap items-center gap-1">
              <span className="mr-1 hidden text-[11px] font-medium tabular-nums text-slate-500 sm:inline">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                size="icon"
                variant="outline"
                title="Zoom in"
                aria-label="Zoom in"
                onClick={() => zoomBy(0.1)}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                title="Zoom out"
                aria-label="Zoom out"
                onClick={() => zoomBy(-0.1)}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                title="Reset view"
                aria-label="Reset view"
                onClick={resetCanvasView}
              >
                <Focus className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant={isFullscreen ? "default" : "outline"}
                className={isFullscreen ? "bg-[#0B8A83] hover:bg-[#097a74]" : undefined}
                title={isFullscreen ? "Exit fullscreen" : "Open fullscreen"}
                aria-label={isFullscreen ? "Exit fullscreen" : "Open fullscreen"}
                aria-pressed={isFullscreen}
                onClick={() => void toggleStudioFullscreen()}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {view === "canvas" ? (
            <Card
              className={cn(
                isFullscreen && "flex min-h-0 flex-1 flex-col border-0 bg-transparent shadow-none"
              )}
            >
              <CardContent className={cn("p-0", isFullscreen && "flex min-h-0 flex-1 flex-col")}>
                <div
                  ref={canvasSurfaceRef}
                  tabIndex={0}
                  className={cn(
                    "relative overflow-hidden bg-[radial-gradient(circle_at_top,#f8fafc,transparent_55%),linear-gradient(#e2e8f022_1px,transparent_1px),linear-gradient(90deg,#e2e8f022_1px,transparent_1px)] bg-[size:auto,24px_24px,24px_24px] outline-none",
                    isFullscreen
                      ? "min-h-0 flex-1 rounded-none"
                      : "h-[70vh] rounded-xl",
                    paletteDropActive && "ring-2 ring-[#0B8A83] ring-offset-2"
                  )}
                  onWheel={(event) => {
                    if (event.ctrlKey || event.metaKey || isFullscreen) {
                      event.preventDefault();
                      zoomBy(event.deltaY > 0 ? -0.08 : 0.08);
                    }
                  }}
                  onDragOver={(event) => {
                    if (previewMode) return;
                    if (![...event.dataTransfer.types].includes(PALETTE_MIME)) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "copy";
                    setPaletteDropActive(true);
                  }}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setPaletteDropActive(false);
                    }
                  }}
                  onDrop={handleCanvasPaletteDrop}
                  onPointerDown={(event) => {
                    const target = event.target as HTMLElement;
                    if (
                      target.closest(
                        "[data-table-node],[data-venue-node],[data-ceremony-row],[data-canvas-ui],button,a,input,select,textarea,label"
                      )
                    ) {
                      return;
                    }
                    clearCanvasSelection();
                    panning.current = {
                      startX: event.clientX,
                      startY: event.clientY,
                      origX: pan.x,
                      origY: pan.y,
                    };
                    try {
                      event.currentTarget.setPointerCapture(event.pointerId);
                    } catch {
                      /* ignore */
                    }
                  }}
                  onPointerMove={(event) => {
                    if (panning.current) {
                      setPan({
                        x: panning.current.origX + (event.clientX - panning.current.startX),
                        y: panning.current.origY + (event.clientY - panning.current.startY),
                      });
                      return;
                    }
                    const resizing = resizeRef.current;
                    if (resizing) {
                      const dw = (event.clientX - resizing.startX) / zoom;
                      const dh = (event.clientY - resizing.startY) / zoom;
                      const next = clampVenueFeatureSize(
                        resizing.origW + dw,
                        resizing.origH + dh
                      );
                      dirtyRef.current = true;
                      setLayout((current) => ({
                        ...current,
                        elements: (current.elements ?? []).map((element) =>
                          element.id === resizing.elementId
                            ? { ...element, width: next.width, height: next.height }
                            : element
                        ),
                      }));
                      return;
                    }
                    const rotating = rotateRef.current;
                    if (rotating) {
                      const point = clientToCanvasPoint(event.clientX, event.clientY);
                      if (!point) return;
                      const angle =
                        (Math.atan2(point.y - rotating.centerY, point.x - rotating.centerX) * 180) /
                        Math.PI;
                      let next = rotating.origRotation + (angle - rotating.startAngle);
                      if (event.shiftKey) next = snapRotationDegrees(next, 15);
                      else next = normalizeRotationDegrees(next);
                      dirtyRef.current = true;
                      if (rotating.kind === "element") {
                        setLayout((current) => ({
                          ...current,
                          elements: (current.elements ?? []).map((element) =>
                            element.id === rotating.elementId
                              ? { ...element, rotation: next }
                              : element
                          ),
                        }));
                      } else if (rotating.kind === "table") {
                        setTables((current) =>
                          current.map((table) =>
                            table.id === rotating.elementId
                              ? { ...table, rotation: next }
                              : table
                          )
                        );
                      } else {
                        setCeremonyRows((current) =>
                          current.map((row) =>
                            row.id === rotating.elementId ? { ...row, rotation: next } : row
                          )
                        );
                        setLayout((current) => ({
                          ...current,
                          ceremonyRows: (current.ceremonyRows ?? []).map((row) =>
                            row.id === rotating.elementId ? { ...row, rotation: next } : row
                          ),
                          planKind: "CEREMONY",
                        }));
                      }
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
                  onPointerUp={(event) => {
                    dragRef.current = null;
                    resizeRef.current = null;
                    rotateRef.current = null;
                    panning.current = null;
                    try {
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    } catch {
                      /* ignore */
                    }
                  }}
                  onPointerCancel={() => {
                    dragRef.current = null;
                    resizeRef.current = null;
                    rotateRef.current = null;
                    panning.current = null;
                    setPaletteDropActive(false);
                  }}
                >
                  <div
                    className="absolute left-0 top-0 origin-top-left"
                    style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                  >
                    {(layout.elements ?? []).map((element) => {
                      const featureInteractive = canInteractWithFeatures();
                      const preset = venueFeaturePreset(element.kind);
                      const width = element.width ?? preset.width;
                      const height = element.height ?? preset.height;
                      const accent = element.color?.trim() || preset.color;
                      const selected = selectedElementId === element.id;
                      const rotation = element.rotation ?? 0;
                      return (
                        <div
                          key={element.id}
                          className="absolute z-[5]"
                          style={{ left: element.x, top: element.y, width, height }}
                        >
                          <div
                            data-venue-node
                            className={cn(
                              "relative h-full w-full overflow-visible rounded-xl border bg-white/90 shadow-sm transition",
                              selected
                                ? "border-[#0B8A83] ring-2 ring-[#0B8A83]/45"
                                : "border-slate-300/80",
                              element.locked
                                ? "cursor-default opacity-90"
                                : featureInteractive
                                  ? "cursor-grab active:cursor-grabbing"
                                  : "pointer-events-none opacity-35",
                              !featureInteractive && "grayscale-[0.35]"
                            )}
                            style={{
                              transform: rotation ? `rotate(${rotation}deg)` : undefined,
                              boxShadow: selected
                                ? `0 8px 24px ${accent}33`
                                : "0 4px 16px rgba(15,23,42,0.08)",
                            }}
                            onPointerDown={(event) => {
                              if (previewMode || !featureInteractive) return;
                              if (
                                (event.target as HTMLElement).closest(
                                  "[data-resize-handle],[data-rotate-handle]"
                                )
                              ) {
                                return;
                              }
                              event.stopPropagation();
                              selectElement(element.id);
                              if (element.locked) return;
                              pushHistory();
                              dragRef.current = {
                                tableId: `element:${element.id}`,
                                startX: event.clientX,
                                startY: event.clientY,
                                origX: element.x,
                                origY: element.y,
                              };
                              try {
                                canvasSurfaceRef.current?.setPointerCapture(event.pointerId);
                              } catch {
                                /* ignore */
                              }
                            }}
                            title={
                              previewMode
                                ? element.label
                                : !featureInteractive
                                  ? "Switch select mode to Features to edit"
                                  : element.locked
                                    ? `${element.label} (locked)`
                                    : "Drag to move · top handle to rotate · corner to resize"
                            }
                          >
                            <VenueFeatureVisual
                              kind={element.kind}
                              label={element.label}
                              color={accent}
                              variant="canvas"
                              className="rounded-[inherit]"
                            />
                            {element.locked && (
                              <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500 shadow-sm">
                                Locked
                              </span>
                            )}
                            {selected && !previewMode && !element.locked && featureInteractive && (
                              <>
                                <div className="pointer-events-none absolute left-1/2 top-0 h-5 w-px -translate-x-1/2 -translate-y-full bg-[#0B8A83]/70" />
                                <button
                                  type="button"
                                  data-rotate-handle
                                  aria-label="Rotate venue feature"
                                  title="Drag to rotate · hold Shift to snap 15°"
                                  className="absolute left-1/2 top-0 z-20 flex h-6 w-6 -translate-x-1/2 -translate-y-[128%] cursor-grab items-center justify-center rounded-full border-2 border-white bg-[#0B8A83] text-white shadow-md active:cursor-grabbing"
                                  onPointerDown={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    const centerX = element.x + width / 2;
                                    const centerY = element.y + height / 2;
                                    const point = clientToCanvasPoint(event.clientX, event.clientY);
                                    if (!point) return;
                                    pushHistory();
                                    rotateRef.current = {
                                      elementId: element.id,
                                      kind: "element",
                                      centerX,
                                      centerY,
                                      startAngle:
                                        (Math.atan2(point.y - centerY, point.x - centerX) * 180) /
                                        Math.PI,
                                      origRotation: rotation,
                                    };
                                    try {
                                      canvasSurfaceRef.current?.setPointerCapture(event.pointerId);
                                    } catch {
                                      /* ignore */
                                    }
                                  }}
                                >
                                  <RotateCw className="h-3 w-3" aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  data-resize-handle
                                  aria-label="Resize venue feature"
                                  title="Drag to resize"
                                  className="absolute -bottom-1.5 -right-1.5 z-20 h-4 w-4 cursor-nwse-resize rounded-sm border-2 border-white bg-[#0B8A83] shadow-md"
                                  onPointerDown={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    pushHistory();
                                    resizeRef.current = {
                                      elementId: element.id,
                                      startX: event.clientX,
                                      startY: event.clientY,
                                      origW: width,
                                      origH: height,
                                    };
                                    try {
                                      canvasSurfaceRef.current?.setPointerCapture(event.pointerId);
                                    } catch {
                                      /* ignore */
                                    }
                                  }}
                                />
                              </>
                            )}
                          </div>
                          {selected && !previewMode && !element.locked && featureInteractive && (
                            <div
                              data-canvas-ui
                              className="absolute -top-10 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1"
                              onPointerDown={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                title="Rotate −15° (Shift −90°)"
                                aria-label="Rotate left"
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-[#0B8A83] hover:text-[#0B8A83]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  rotateVenueElement(element.id, event.shiftKey ? -90 : -15);
                                }}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold tabular-nums text-slate-700 shadow-sm ring-1 ring-slate-200">
                                {Math.round(rotation)}°
                              </span>
                              <button
                                type="button"
                                title="Rotate +15° (Shift +90°)"
                                aria-label="Rotate right"
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-[#0B8A83] hover:text-[#0B8A83]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  rotateVenueElement(element.id, event.shiftKey ? 90 : 15);
                                }}
                              >
                                <RotateCw className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Reset rotation"
                                aria-label="Reset rotation"
                                className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 shadow-sm hover:border-[#0B8A83] hover:text-[#0B8A83]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  rotateVenueElement(element.id, 0, 0);
                                }}
                              >
                                0°
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {planType === "CEREMONY" ? (
                      ceremonyRows.length === 0 ? (
                        <div
                          data-canvas-ui
                          className={cn(
                            "flex flex-col items-center justify-center gap-3 px-6 text-center",
                            isFullscreen ? "h-[100dvh] w-[min(100vw,920px)]" : "h-[70vh] w-[720px]"
                          )}
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          <div className="rounded-2xl border border-dashed border-[#0B8A83]/40 bg-[#0B8A83]/5 px-8 py-10">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#0B8A83]/20">
                              <Armchair className="h-6 w-6 text-[#0B8A83]" aria-hidden />
                            </div>
                            <p className="text-base font-semibold text-slate-800">
                              Build your ceremony seating
                            </p>
                            <p className="mt-2 max-w-sm text-sm text-slate-500">
                              Auto-generate rows with a centre aisle, add family sections, then click
                              chairs to assign guests — same workflow as reception tables.
                            </p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="bg-[#0B8A83] hover:bg-[#097a74]"
                                disabled={previewMode}
                                onPointerDown={(event) => event.stopPropagation()}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  generateCeremony();
                                }}
                              >
                                <Wand2 className="h-4 w-4" /> Auto-Generate Rows
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={previewMode}
                                onPointerDown={(event) => event.stopPropagation()}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  addCeremonySection();
                                }}
                              >
                                <Plus className="h-4 w-4" /> New Zone
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={previewMode}
                                onPointerDown={(event) => event.stopPropagation()}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  addCeremonyRow();
                                }}
                              >
                                <Plus className="h-4 w-4" /> Add Row
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
                            const rowBoxWidth = rowWidth + 16;
                            const rowBoxHeight = 72;
                            const rowInteractive = canInteractWithRows();
                            const selected =
                              selectedRowIds.includes(row.id) || selectedTableId === row.id;
                            const zoneColor = section?.color;
                            const rotation = row.rotation ?? 0;
                            return (
                              <div
                                key={row.id}
                                className="absolute z-10"
                                style={{ left: row.x ?? 0, top: row.y ?? 0 }}
                              >
                                <div
                                  data-ceremony-row
                                  className={cn(
                                    "relative rounded-xl p-2 transition",
                                    rowInteractive
                                      ? "cursor-grab active:cursor-grabbing"
                                      : "pointer-events-none opacity-35 grayscale-[0.35]",
                                    selected
                                      ? "ring-2 ring-[#0B8A83]/60"
                                      : rowInteractive && !zoneColor && "hover:bg-slate-50/80",
                                    row.locked && "opacity-80"
                                  )}
                                  style={{
                                    transform: rotation ? `rotate(${rotation}deg)` : undefined,
                                    background: zoneColor
                                      ? selected
                                        ? `${zoneColor}28`
                                        : `${zoneColor}16`
                                      : selected
                                        ? "rgba(11,138,131,0.10)"
                                        : undefined,
                                    boxShadow: zoneColor
                                      ? `inset 4px 0 0 ${zoneColor}`
                                      : undefined,
                                  }}
                                  onPointerDown={(event) => {
                                    if (previewMode || row.locked || !rowInteractive) return;
                                    if (
                                      (event.target as HTMLElement).closest(
                                        "button,[data-rotate-handle],[data-canvas-ui]"
                                      )
                                    ) {
                                      return;
                                    }
                                    event.stopPropagation();
                                    const additive =
                                      event.metaKey || event.ctrlKey || event.shiftKey;
                                    toggleRowSelection(row.id, additive);
                                    pushHistory();
                                    dragRef.current = {
                                      tableId: `row:${row.id}`,
                                      startX: event.clientX,
                                      startY: event.clientY,
                                      origX: row.x ?? 0,
                                      origY: row.y ?? 0,
                                    };
                                    try {
                                      canvasSurfaceRef.current?.setPointerCapture(event.pointerId);
                                    } catch {
                                      /* ignore */
                                    }
                                  }}
                                  title={
                                    previewMode || !rowInteractive
                                      ? row.label
                                      : row.locked
                                        ? `${row.label} (locked)`
                                        : "Drag to move · top handle to rotate"
                                  }
                                >
                                  <div className="mb-1.5 flex items-center gap-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                                      {row.label}
                                    </p>
                                    {section && (
                                      <span
                                        className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-sm"
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
                                              ? `${chair.label} · ${occupied.guestName}${
                                                  section ? ` · ${section.name}` : ""
                                                }`
                                              : `${chair.label} available${
                                                  section ? ` · ${section.name}` : ""
                                                }`
                                          }
                                          className={cn(
                                            "absolute flex h-9 w-9 flex-col items-center justify-center rounded-md border text-[9px] font-semibold shadow-sm transition",
                                            occupied
                                              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                                              : zoneColor
                                                ? "bg-white text-slate-700"
                                                : "border-slate-300 bg-white text-slate-700 hover:border-[#0B8A83]",
                                            seatSelected && "ring-2 ring-[#0B8A83] ring-offset-1",
                                            chair.accessible && "border-emerald-400"
                                          )}
                                          style={{
                                            left: (chair.x ?? row.x ?? 0) - (row.x ?? 0),
                                            top: 0,
                                            ...(!occupied && zoneColor
                                              ? {
                                                  borderColor: zoneColor,
                                                  boxShadow: `inset 0 0 0 1px ${zoneColor}55`,
                                                }
                                              : {}),
                                          }}
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            if (previewMode || row.locked || !rowInteractive) return;
                                            toggleRowSelection(row.id, false);
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
                                  {selected && !previewMode && !row.locked && rowInteractive && (
                                    <>
                                      <div className="pointer-events-none absolute left-1/2 top-0 h-5 w-px -translate-x-1/2 -translate-y-full bg-[#0B8A83]/70" />
                                      <button
                                        type="button"
                                        data-rotate-handle
                                        aria-label="Rotate row"
                                        title="Drag to rotate · hold Shift to snap 15°"
                                        className="absolute left-1/2 top-0 z-20 flex h-6 w-6 -translate-x-1/2 -translate-y-[128%] cursor-grab items-center justify-center rounded-full border-2 border-white bg-[#0B8A83] text-white shadow-md active:cursor-grabbing"
                                        onPointerDown={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          const centerX = (row.x ?? 0) + rowBoxWidth / 2;
                                          const centerY = (row.y ?? 0) + rowBoxHeight / 2;
                                          const point = clientToCanvasPoint(
                                            event.clientX,
                                            event.clientY
                                          );
                                          if (!point) return;
                                          pushHistory();
                                          rotateRef.current = {
                                            elementId: row.id,
                                            kind: "row",
                                            centerX,
                                            centerY,
                                            startAngle:
                                              (Math.atan2(
                                                point.y - centerY,
                                                point.x - centerX
                                              ) *
                                                180) /
                                              Math.PI,
                                            origRotation: rotation,
                                          };
                                          try {
                                            canvasSurfaceRef.current?.setPointerCapture(
                                              event.pointerId
                                            );
                                          } catch {
                                            /* ignore */
                                          }
                                        }}
                                      >
                                        <RotateCw className="h-3 w-3" aria-hidden />
                                      </button>
                                    </>
                                  )}
                                </div>
                                {selected && !previewMode && !row.locked && rowInteractive && (
                                  <div
                                    data-canvas-ui
                                    className="absolute -top-10 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1"
                                    onPointerDown={(event) => event.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      title="Rotate −15° (Shift −90°)"
                                      aria-label="Rotate row left"
                                      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-[#0B8A83] hover:text-[#0B8A83]"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        rotateCanvasItem(
                                          "row",
                                          row.id,
                                          event.shiftKey ? -90 : -15
                                        );
                                      }}
                                    >
                                      <RotateCcw className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold tabular-nums text-slate-700 shadow-sm ring-1 ring-slate-200">
                                      {Math.round(rotation)}°
                                    </span>
                                    <button
                                      type="button"
                                      title="Rotate +15° (Shift +90°)"
                                      aria-label="Rotate row right"
                                      className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-[#0B8A83] hover:text-[#0B8A83]"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        rotateCanvasItem(
                                          "row",
                                          row.id,
                                          event.shiftKey ? 90 : 15
                                        );
                                      }}
                                    >
                                      <RotateCw className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      title="Reset rotation"
                                      aria-label="Reset row rotation"
                                      className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 shadow-sm hover:border-[#0B8A83] hover:text-[#0B8A83]"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        rotateCanvasItem("row", row.id, 0, 0);
                                      }}
                                    >
                                      0°
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </>
                      )
                    ) : tables.length === 0 && !(layout.elements ?? []).length ? (
                      <div
                        data-canvas-ui
                        className={cn(
                          "flex flex-col items-center justify-center gap-3 px-6 text-center",
                          isFullscreen ? "h-[100dvh] w-[min(100vw,920px)]" : "h-[70vh] w-[720px]"
                        )}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <div className="rounded-2xl border border-dashed border-[#0B8A83]/40 bg-[#0B8A83]/5 px-8 py-10">
                          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#0B8A83]/20">
                            <Armchair className="h-6 w-6 text-[#0B8A83]" aria-hidden />
                          </div>
                          <p className="text-base font-semibold text-slate-800">
                            Build your reception floor plan
                          </p>
                          <p className="mt-2 max-w-sm text-sm text-slate-500">
                            Auto-generate tables from your guest count, or add one table to place and
                            arrange on the grid.
                          </p>
                          <div className="mt-4 flex flex-wrap justify-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="bg-[#0B8A83] hover:bg-[#097a74]"
                              disabled={previewMode}
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation();
                                autoGenerateTables();
                              }}
                            >
                              <Wand2 className="h-4 w-4" /> Auto-Generate Tables
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={previewMode}
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation();
                                addTable("round");
                              }}
                            >
                              <Plus className="h-4 w-4" /> Add Table
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      tables.map((table) => {
                        const tableInteractive = canInteractWithRows();
                        const rotation = table.rotation ?? 0;
                        const selected = selectedTableId === table.id;
                        const tableNodeW = 220;
                        const tableNodeH = 280;
                        return (
                        <div
                          key={table.id}
                          className="absolute z-10"
                          style={{ left: table.x ?? 0, top: table.y ?? 0 }}
                        >
                          <div
                            data-table-node
                            className={cn(
                              "relative transition",
                              table.locked
                                ? "cursor-default"
                                : tableInteractive
                                  ? "cursor-grab active:cursor-grabbing"
                                  : "pointer-events-none opacity-35 grayscale-[0.35]"
                            )}
                            style={{
                              transform: rotation ? `rotate(${rotation}deg)` : undefined,
                            }}
                            onPointerDown={(event) => {
                              if (previewMode || !tableInteractive) return;
                              if (
                                (event.target as HTMLElement).closest(
                                  "[data-rotate-handle],[data-canvas-ui]"
                                )
                              ) {
                                return;
                              }
                              event.stopPropagation();
                              selectTable(table.id);
                              if (table.locked) return;
                              pushHistory();
                              dragRef.current = {
                                tableId: table.id,
                                startX: event.clientX,
                                startY: event.clientY,
                                origX: table.x ?? 0,
                                origY: table.y ?? 0,
                              };
                              try {
                                canvasSurfaceRef.current?.setPointerCapture(event.pointerId);
                              } catch {
                                /* ignore */
                              }
                            }}
                            title={
                              previewMode || !tableInteractive
                                ? table.label
                                : table.locked
                                  ? `${table.label} (locked)`
                                  : "Drag to move · top handle to rotate"
                            }
                          >
                            <StudioTableVisual
                              table={table}
                              assignments={assignmentViews}
                              selected={selected}
                              interactive={!previewMode && tableInteractive}
                              selectedSeat={selected ? selectedSeat : null}
                              companionHoldCount={
                                companionHolds.filter(
                                  (hold) =>
                                    hold.status === "ACTIVE" &&
                                    tablesMatch(hold.tableNumber, table.label)
                                ).length
                              }
                              onSelect={() => {
                                if (previewMode || !tableInteractive) return;
                                selectTable(table.id);
                              }}
                              onSeatSelect={(seatIndex) => {
                                if (previewMode || !tableInteractive) return;
                                selectTable(table.id);
                                setSelectedSeat(seatIndex);
                                setAssignOpen(true);
                              }}
                            />
                            {selected && !previewMode && !table.locked && tableInteractive && (
                              <>
                                <div className="pointer-events-none absolute left-1/2 top-0 h-5 w-px -translate-x-1/2 -translate-y-full bg-[#0B8A83]/70" />
                                <button
                                  type="button"
                                  data-rotate-handle
                                  aria-label="Rotate table"
                                  title="Drag to rotate · hold Shift to snap 15°"
                                  className="absolute left-1/2 top-0 z-20 flex h-6 w-6 -translate-x-1/2 -translate-y-[128%] cursor-grab items-center justify-center rounded-full border-2 border-white bg-[#0B8A83] text-white shadow-md active:cursor-grabbing"
                                  onPointerDown={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    const centerX = (table.x ?? 0) + tableNodeW / 2;
                                    const centerY = (table.y ?? 0) + tableNodeH / 2;
                                    const point = clientToCanvasPoint(event.clientX, event.clientY);
                                    if (!point) return;
                                    pushHistory();
                                    rotateRef.current = {
                                      elementId: table.id,
                                      kind: "table",
                                      centerX,
                                      centerY,
                                      startAngle:
                                        (Math.atan2(point.y - centerY, point.x - centerX) * 180) /
                                        Math.PI,
                                      origRotation: rotation,
                                    };
                                    try {
                                      canvasSurfaceRef.current?.setPointerCapture(event.pointerId);
                                    } catch {
                                      /* ignore */
                                    }
                                  }}
                                >
                                  <RotateCw className="h-3 w-3" aria-hidden />
                                </button>
                              </>
                            )}
                          </div>
                          {selected && !previewMode && !table.locked && tableInteractive && (
                            <div
                              data-canvas-ui
                              className="absolute -top-10 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1"
                              onPointerDown={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                title="Rotate −15° (Shift −90°)"
                                aria-label="Rotate table left"
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-[#0B8A83] hover:text-[#0B8A83]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  rotateCanvasItem(
                                    "table",
                                    table.id,
                                    event.shiftKey ? -90 : -15
                                  );
                                }}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold tabular-nums text-slate-700 shadow-sm ring-1 ring-slate-200">
                                {Math.round(rotation)}°
                              </span>
                              <button
                                type="button"
                                title="Rotate +15° (Shift +90°)"
                                aria-label="Rotate table right"
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-[#0B8A83] hover:text-[#0B8A83]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  rotateCanvasItem(
                                    "table",
                                    table.id,
                                    event.shiftKey ? 90 : 15
                                  );
                                }}
                              >
                                <RotateCw className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Reset rotation"
                                aria-label="Reset table rotation"
                                className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 shadow-sm hover:border-[#0B8A83] hover:text-[#0B8A83]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  rotateCanvasItem("table", table.id, 0, 0);
                                }}
                              >
                                0°
                              </button>
                            </div>
                          )}
                        </div>
                        );
                      })
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

        <div
          className={cn("space-y-4", isFullscreen && "hidden")}
          ref={guestPanelRef}
        >
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

      {selectedElement && !previewMode && (
        <VenueFeatureInspector
          element={selectedElement}
          previewMode={previewMode}
          variant="sheet"
          className="fixed inset-x-0 bottom-0 z-40 max-h-[50vh] overflow-y-auto rounded-t-2xl border bg-white p-4 shadow-2xl lg:hidden"
          onRename={renameSelectedElement}
          onUpdate={updateSelectedElement}
          onDelete={() => removeVenueElement(selectedElement.id)}
        />
      )}

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
