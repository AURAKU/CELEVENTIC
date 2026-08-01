"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2, UserMinus, UserPlus, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  seatingPlanningLabel,
  seatingPlanningTone,
} from "@/lib/seating/guest-planning-status";
import {
  tableOccupancyCount,
  type SeatingCompanionHoldView,
} from "@/lib/seating/party-capacity";
import {
  seatDisplayName,
  tableDisplayName,
  tablesMatch,
} from "@/lib/seating/seating-types";
import {
  TABLE_KIND_PRESETS,
  ZONE_PRESETS,
  type StudioAssignment,
  type StudioGuest,
  type StudioTableConfig,
  type StudioTableKind,
} from "@/lib/seating/studio-types";
import { cn } from "@/lib/utils";

export type TableInspectorProps = {
  table: StudioTableConfig;
  guests: StudioGuest[];
  assignments: StudioAssignment[];
  companionHolds: SeatingCompanionHoldView[];
  tableOnly: boolean;
  previewMode?: boolean;
  onUpdateTable: (patch: Partial<StudioTableConfig>) => void;
  onRenameTable: (label: string) => void;
  onDeleteRequest: () => void;
  onAssignGuests: () => void;
  onUnassignGuest: (guestId: string) => void;
  onUnassignHold?: (holdId: string) => void;
  onUnassignAll: () => void;
  onSelectGuest?: (guestId: string) => void;
  className?: string;
  /** mobile bottom sheet vs desktop drawer styling */
  variant?: "drawer" | "sheet";
};

function zonePresetColor(zone?: string | null): string | undefined {
  if (!zone?.trim()) return undefined;
  const match = ZONE_PRESETS.find(
    (preset) => preset.name.toLowerCase() === zone.trim().toLowerCase()
  );
  return match?.color;
}

function planningBadgeClass(status?: string | null): string {
  switch (seatingPlanningTone(status)) {
    case "admitted":
      return "bg-emerald-100 text-emerald-800";
    case "accepted":
      return "bg-teal-100 text-teal-800";
    case "opened":
      return "bg-sky-100 text-sky-800";
    case "maybe":
      return "bg-amber-100 text-amber-800";
    case "declined":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function admissionLabel(guest: StudioGuest): string | null {
  if (!guest.admission) return null;
  if (guest.admission.state === "CHECKED_IN" || guest.status === "CHECKED_IN") {
    return "Admitted";
  }
  if (guest.admission.admittedCount > 0) {
    return `${guest.admission.admittedCount}/${guest.admission.allowance} admitted`;
  }
  return `${guest.admission.allowance} allowance`;
}

export function TableInspector({
  table,
  guests,
  assignments,
  companionHolds,
  tableOnly,
  previewMode = false,
  onUpdateTable,
  onRenameTable,
  onDeleteRequest,
  onAssignGuests,
  onUnassignGuest,
  onUnassignHold,
  onUnassignAll,
  onSelectGuest,
  className,
  variant = "drawer",
}: TableInspectorProps) {
  const [nameDraft, setNameDraft] = useState(table.label);
  const [customZone, setCustomZone] = useState(() => {
    const zone = table.zone?.trim() ?? "";
    const preset = ZONE_PRESETS.some((item) => item.name.toLowerCase() === zone.toLowerCase());
    return zone && !preset ? zone : "";
  });

  useEffect(() => {
    setNameDraft(table.label);
    const zone = table.zone?.trim() ?? "";
    const preset = ZONE_PRESETS.some((item) => item.name.toLowerCase() === zone.toLowerCase());
    setCustomZone(zone && !preset ? zone : "");
  }, [table.id, table.label, table.zone]);

  const guestById = useMemo(() => new Map(guests.map((guest) => [guest.id, guest])), [guests]);

  const tableAssignments = useMemo(
    () => assignments.filter((row) => tablesMatch(row.tableNumber, table.label)),
    [assignments, table.label]
  );

  const tableHolds = useMemo(
    () =>
      companionHolds.filter(
        (hold) => hold.status === "ACTIVE" && tablesMatch(hold.tableNumber, table.label)
      ),
    [companionHolds, table.label]
  );

  const capacity = table.seatCount ?? table.capacity ?? 8;
  const occupancy = tableOccupancyCount({
    tableLabel: table.label,
    assignments,
    holds: companionHolds,
  });

  const zoneColor = table.color ?? zonePresetColor(table.zone);
  const zoneIsPreset = ZONE_PRESETS.some(
    (preset) => preset.name.toLowerCase() === (table.zone ?? "").trim().toLowerCase()
  );
  const isVipZone = /vip/i.test(table.zone ?? "") || Boolean(table.vip);
  const readOnly = previewMode;
  const displayName = tableDisplayName(table.label);

  const shellClass =
    variant === "sheet"
      ? "rounded-t-2xl border-t border-slate-200 bg-white shadow-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"
      : "rounded-xl border border-slate-200 bg-white shadow-sm";

  return (
    <aside
      className={cn("flex max-h-[min(85vh,720px)] flex-col overflow-hidden", shellClass, className)}
      aria-label={`Table inspector for ${displayName}`}
    >
      <header className="shrink-0 border-b border-slate-100 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Table inspector
            </p>
            <h2 className="truncate text-lg font-semibold text-slate-900">{displayName}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Users className="h-3 w-3" aria-hidden />
                {occupancy} of {capacity}
              </Badge>
              {table.zone && (
                <Badge
                  variant="outline"
                  className="gap-1.5 text-[10px]"
                  style={
                    zoneColor
                      ? { borderColor: zoneColor, color: zoneColor, backgroundColor: `${zoneColor}14` }
                      : undefined
                  }
                >
                  {zoneColor && (
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: zoneColor }}
                      aria-hidden
                    />
                  )}
                  {table.zone}
                </Badge>
              )}
              {isVipZone && (
                <Badge variant="secondary" className="text-[10px]">
                  VIP
                </Badge>
              )}
              {table.locked && (
                <Badge variant="outline" className="text-[10px] text-slate-500">
                  Locked
                </Badge>
              )}
            </div>
          </div>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={onDeleteRequest}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              <span className="sr-only sm:not-sr-only">Delete</span>
            </Button>
          )}
        </div>
      </header>

      <Tabs defaultValue="guests" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-4 mt-3 h-auto w-auto shrink-0 flex-wrap justify-start gap-1 bg-slate-100/80 p-1">
          <TabsTrigger value="guests" className="min-h-9 px-2.5 text-xs sm:text-sm">
            Guests
          </TabsTrigger>
          <TabsTrigger value="details" className="min-h-9 px-2.5 text-xs sm:text-sm">
            Table Details
          </TabsTrigger>
          <TabsTrigger value="appearance" className="min-h-9 px-2.5 text-xs sm:text-sm">
            Appearance
          </TabsTrigger>
          <TabsTrigger value="rules" className="min-h-9 px-2.5 text-xs sm:text-sm">
            Rules
          </TabsTrigger>
          <TabsTrigger value="activity" className="min-h-9 px-2.5 text-xs sm:text-sm">
            Activity
          </TabsTrigger>
        </TabsList>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <TabsContent value="guests" className="mt-0 space-y-4">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">{occupancy}</span> of{" "}
              <span className="font-medium text-slate-900">{capacity}</span> places assigned
            </p>

            {tableAssignments.length === 0 && tableHolds.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
                <p className="text-sm font-medium text-slate-700">No guests assigned yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  Assign named guests{tableOnly ? "" : " and seats"} from your guest list.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {tableAssignments.map((assignment) => {
                  const guest = guestById.get(assignment.guestId);
                  if (!guest) return null;
                  const showVip = guest.vip || guest.tags?.some((tag) => /vip/i.test(tag.label));
                  const admission = admissionLabel(guest);
                  return (
                    <li
                      key={assignment.guestId}
                      className={cn(
                        "rounded-xl border border-slate-200 p-3",
                        onSelectGuest && "cursor-pointer hover:border-[#0B8A83]/40 hover:bg-[#0B8A83]/5"
                      )}
                      onClick={() => onSelectGuest?.(assignment.guestId)}
                      onKeyDown={(event) => {
                        if (!onSelectGuest) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelectGuest(assignment.guestId);
                        }
                      }}
                      role={onSelectGuest ? "button" : undefined}
                      tabIndex={onSelectGuest ? 0 : undefined}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-900">{guest.name}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {guest.tags?.map((tag) => (
                              <Badge key={tag.id} variant="outline" className="text-[10px]">
                                {tag.label}
                              </Badge>
                            ))}
                            {showVip && (
                              <Badge variant="secondary" className="text-[10px]">
                                VIP
                              </Badge>
                            )}
                            <Badge
                              className={cn("text-[10px]", planningBadgeClass(guest.status))}
                            >
                              {seatingPlanningLabel(guest.status)}
                            </Badge>
                            {admission && (
                              <Badge variant="outline" className="text-[10px]">
                                {admission}
                              </Badge>
                            )}
                            {!tableOnly && assignment.seatLabel && (
                              <Badge variant="outline" className="text-[10px]">
                                {seatDisplayName(assignment.seatLabel)}
                              </Badge>
                            )}
                            {tableOnly && (
                              <Badge variant="outline" className="text-[10px]">
                                Table place
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px]">
                              Party {guest.partySize}
                            </Badge>
                          </div>
                        </div>
                        {!readOnly && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="min-h-11 shrink-0"
                            onClick={(event) => {
                              event.stopPropagation();
                              onUnassignGuest(assignment.guestId);
                            }}
                          >
                            <UserMinus className="h-4 w-4" aria-hidden />
                            <span className="sr-only">Unassign {guest.name}</span>
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}

                {tableHolds.map((hold) => (
                  <li
                    key={hold.id}
                    className="rounded-xl border border-dashed border-amber-200 bg-amber-50/50 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">{hold.displayLabel}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[10px]">
                            Companion place
                          </Badge>
                          <Badge variant="warning" className="text-[10px]">
                            Held
                          </Badge>
                          {!tableOnly && hold.seatLabel && (
                            <Badge variant="outline" className="text-[10px]">
                              {seatDisplayName(hold.seatLabel)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {!readOnly && onUnassignHold && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-11 shrink-0"
                          onClick={() => onUnassignHold(hold.id)}
                        >
                          <UserMinus className="h-4 w-4" aria-hidden />
                          <span className="sr-only">Release {hold.displayLabel}</span>
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {!readOnly && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  className="min-h-11 flex-1 bg-[#0B8A83] hover:bg-[#0B8A83]/90"
                  onClick={onAssignGuests}
                >
                  <UserPlus className="h-4 w-4" aria-hidden />
                  Assign guests
                </Button>
                {(tableAssignments.length > 0 || tableHolds.length > 0) && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={onUnassignAll}
                  >
                    Unassign all
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="details" className="mt-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`table-name-${table.id}`}>Table name</Label>
              <Input
                id={`table-name-${table.id}`}
                value={nameDraft}
                disabled={readOnly}
                onChange={(event) => setNameDraft(event.target.value)}
                onBlur={() => {
                  const next = nameDraft.trim();
                  if (next && next !== table.label) onRenameTable(next);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`table-kind-${table.id}`}>Table type</Label>
              <select
                id={`table-kind-${table.id}`}
                disabled={readOnly}
                value={table.kind ?? "round"}
                className="flex min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20 disabled:opacity-50"
                onChange={(event) => {
                  const kind = event.target.value as StudioTableKind;
                  const preset = TABLE_KIND_PRESETS[kind];
                  onUpdateTable({
                    kind,
                    shape: preset.shape,
                    seatCount: preset.defaultSeats,
                    capacity: preset.defaultSeats,
                    vip: preset.vip ?? table.vip,
                  });
                }}
              >
                {Object.entries(TABLE_KIND_PRESETS).map(([key, preset]) => (
                  <option key={key} value={key}>
                    {preset.label} · {preset.defaultSeats} seats
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`table-capacity-${table.id}`}>Capacity</Label>
              <Input
                id={`table-capacity-${table.id}`}
                type="number"
                min={1}
                max={99}
                disabled={readOnly}
                value={capacity}
                onChange={(event) => {
                  const next = Math.max(1, Number(event.target.value) || 1);
                  onUpdateTable({ seatCount: next, capacity: next });
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`table-zone-${table.id}`}>Zone</Label>
              <select
                id={`table-zone-${table.id}`}
                disabled={readOnly}
                value={zoneIsPreset ? table.zone ?? "" : "__custom__"}
                className="flex min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus-visible:border-brand-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20 disabled:opacity-50"
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "__custom__") {
                    onUpdateTable({ zone: customZone || undefined });
                    return;
                  }
                  onUpdateTable({ zone: value || undefined });
                }}
              >
                <option value="">No zone</option>
                {ZONE_PRESETS.map((preset) => (
                  <option key={preset.name} value={preset.name}>
                    {preset.name}
                  </option>
                ))}
                <option value="__custom__">Custom zone…</option>
              </select>
              {(!zoneIsPreset || customZone) && (
                <Input
                  placeholder="Custom zone name"
                  disabled={readOnly}
                  value={customZone}
                  onChange={(event) => {
                    const next = event.target.value;
                    setCustomZone(next);
                    onUpdateTable({ zone: next.trim() || undefined });
                  }}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`table-notes-${table.id}`}>Notes</Label>
              <Textarea
                id={`table-notes-${table.id}`}
                disabled={readOnly}
                value={table.notes ?? ""}
                placeholder="Usher notes, dietary reminders, accessibility details…"
                className="min-h-[88px]"
                onChange={(event) => onUpdateTable({ notes: event.target.value || undefined })}
              />
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={Boolean(table.vip)}
                  className="h-4 w-4 rounded border-slate-300"
                  onChange={(event) => onUpdateTable({ vip: event.target.checked })}
                />
                <span className="text-sm font-medium text-slate-800">VIP table</span>
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={Boolean(table.locked)}
                  className="h-4 w-4 rounded border-slate-300"
                  onChange={(event) => onUpdateTable({ locked: event.target.checked })}
                />
                <span className="text-sm font-medium text-slate-800">Lock table layout</span>
              </label>
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="mt-0 space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <span
                className="inline-flex h-10 w-10 shrink-0 rounded-full border border-slate-200 shadow-inner"
                style={{ backgroundColor: zoneColor ?? "#E2E8F0" }}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">Table colour</p>
                <p className="text-xs text-slate-500">
                  {table.color
                    ? "Custom table colour"
                    : table.zone
                      ? `Inherited from ${table.zone} zone`
                      : "Default floor plan styling"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`table-color-${table.id}`}>Custom colour (hex)</Label>
              <div className="flex gap-2">
                <Input
                  id={`table-color-${table.id}`}
                  disabled={readOnly}
                  value={table.color ?? ""}
                  placeholder="#0B8A83"
                  onChange={(event) =>
                    onUpdateTable({ color: event.target.value.trim() || undefined })
                  }
                />
                <input
                  type="color"
                  disabled={readOnly}
                  value={table.color ?? zoneColor ?? "#64748B"}
                  className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                  onChange={(event) => onUpdateTable({ color: event.target.value })}
                  aria-label="Pick table colour"
                />
              </div>
            </div>

            {!table.color && table.zone && (
              <div className="space-y-2">
                <Label>Zone palette</Label>
                <div className="flex flex-wrap gap-2">
                  {ZONE_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      disabled={readOnly}
                      className={cn(
                        "inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-xs font-medium transition",
                        table.zone?.toLowerCase() === preset.name.toLowerCase()
                          ? "border-[#0B8A83] bg-[#0B8A83]/5 text-[#0B8A83]"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      )}
                      onClick={() => onUpdateTable({ zone: preset.name })}
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: preset.color }}
                        aria-hidden
                      />
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="rules" className="mt-0 space-y-4">
            <p className="text-sm text-slate-600">
              Configure seating behaviour for this table. Use notes for accessibility or usher
              guidance that does not have a dedicated field.
            </p>

            <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={Boolean(table.seatsAtEnds)}
                  className="h-4 w-4 rounded border-slate-300"
                  onChange={(event) => onUpdateTable({ seatsAtEnds: event.target.checked })}
                />
                <span className="text-sm text-slate-800">Place seats at table ends</span>
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={table.numberingClockwise !== false}
                  className="h-4 w-4 rounded border-slate-300"
                  onChange={(event) => onUpdateTable({ numberingClockwise: event.target.checked })}
                />
                <span className="text-sm text-slate-800">Number seats clockwise</span>
              </label>
            </div>

            {table.category && (
              <div className="rounded-xl border border-slate-100 px-3 py-2 text-sm text-slate-600">
                Category: <span className="font-medium text-slate-900">{table.category}</span>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-0">
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
              <p className="text-sm text-slate-600">
                Recent seating changes appear in audit history.
              </p>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}
