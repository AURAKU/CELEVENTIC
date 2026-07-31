"use client";

import { CheckCircle2, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeSeatPositions } from "@/lib/seating/seating-layout";
import {
  normalizeTable,
  tableCaptionValue,
  tableDisplayName,
  tablesMatch,
  type GuestAssignmentView,
} from "@/lib/seating/seating-types";
import type { StudioTableConfig } from "@/lib/seating/studio-types";

interface StudioTableVisualProps {
  table: StudioTableConfig;
  assignments: GuestAssignmentView[];
  selected?: boolean;
  interactive?: boolean;
  selectedSeat?: number | null;
  admittedByGuestId?: Record<string, boolean>;
  onSelect?: () => void;
  onSeatSelect?: (seatIndex: number) => void;
  className?: string;
}

export function StudioTableVisual({
  table: rawTable,
  assignments,
  selected,
  interactive,
  selectedSeat,
  admittedByGuestId,
  onSelect,
  onSeatSelect,
  className,
}: StudioTableVisualProps) {
  const table = normalizeTable(rawTable);
  const seats = computeSeatPositions(table.shape ?? "round", table.seatCount ?? 8);
  const tableAssignments = assignments.filter((assignment) =>
    tablesMatch(assignment.tableNumber, table.label)
  );
  const filled = tableAssignments.length;
  const capacity = table.seatCount ?? 8;
  const admitted = tableAssignments.filter(
    (assignment) => assignment.admitted || admittedByGuestId?.[assignment.guestId]
  ).length;
  const fillRatio = capacity > 0 ? filled / capacity : 0;

  function assignmentForSeat(seatIndex: number) {
    const label = String(seatIndex);
    return tableAssignments.find(
      (assignment) =>
        assignment.seatLabel?.trim() === label ||
        assignment.seatLabel?.trim() === `Seat ${label}`
    );
  }

  const shapeClass =
    table.shape === "rectangle"
      ? "h-20 w-32 rounded-[1.25rem] sm:h-24 sm:w-36"
      : table.shape === "square"
        ? "h-24 w-24 rounded-2xl sm:h-28 sm:w-28"
        : "h-24 w-24 rounded-full sm:h-28 sm:w-28";

  return (
    <div
      className={cn(
        "relative flex w-[220px] flex-col items-center gap-2 rounded-3xl p-3 transition-all",
        selected && "bg-[#0B8A83]/8 ring-2 ring-[#0B8A83]",
        className
      )}
    >
      <button
        type="button"
        className="w-full text-center"
        onClick={() => onSelect?.()}
        disabled={!interactive}
      >
        <div className="flex items-center justify-center gap-1.5">
          <p className="text-sm font-semibold text-slate-900">{tableDisplayName(table.label)}</p>
          {rawTable.vip && <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
          {rawTable.locked && <Lock className="h-3.5 w-3.5 text-slate-400" />}
        </div>
        {(table.zone || rawTable.category) && (
          <p className="text-[10px] uppercase tracking-wide text-slate-500">
            {table.zone || rawTable.category}
          </p>
        )}
        <p className="text-[10px] text-slate-400">
          {filled}/{capacity} seated
          {admitted > 0 ? ` · ${admitted} in` : ""}
        </p>
      </button>

      <div className="relative flex h-52 w-52 items-center justify-center">
        <div
          className={cn(
            "absolute z-0 flex items-center justify-center border-2 shadow-[inset_0_8px_18px_rgba(15,23,42,0.08),0_10px_24px_-16px_rgba(11,138,131,0.55)]",
            shapeClass,
            rawTable.vip ? "border-amber-400/70 from-amber-50 to-white" : "border-[#D4A63A]/55 from-amber-50 to-white",
            "bg-gradient-to-br"
          )}
          style={{
            boxShadow: `inset 0 0 0 3px rgba(255,255,255,0.65), 0 0 0 4px color-mix(in srgb, #0B8A83 ${Math.round(fillRatio * 55)}%, transparent)`,
          }}
        >
          <span className="px-1 text-center font-display text-lg font-bold leading-tight text-[#0B8A83]">
            {tableCaptionValue(table.label)}
          </span>
        </div>

        {seats.map((seat) => {
          const assignment = assignmentForSeat(seat.index);
          const occupied = Boolean(assignment);
          const seatAdmitted =
            assignment?.admitted ||
            assignment?.guestStatus === "CHECKED_IN" ||
            Boolean(assignment && admittedByGuestId?.[assignment.guestId]);
          return (
            <button
              key={seat.index}
              type="button"
              disabled={!interactive}
              onClick={(event) => {
                event.stopPropagation();
                onSelect?.();
                onSeatSelect?.(seat.index);
              }}
              className={cn(
                "absolute z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 text-[9px] font-bold transition-transform",
                interactive && "hover:scale-110",
                selectedSeat === seat.index && "ring-2 ring-[#D4A63A] ring-offset-2",
                occupied
                  ? seatAdmitted
                    ? "border-emerald-600 bg-emerald-500 text-white shadow-md"
                    : "border-[#0B8A83] bg-[#0B8A83] text-white shadow-md"
                  : "border-slate-300 bg-white text-slate-400 hover:border-[#0B8A83] hover:text-[#0B8A83]"
              )}
              style={{
                left: `calc(50% + ${seat.offsetX * 0.82}px)`,
                top: `calc(50% + ${seat.offsetY * 0.82}px)`,
                transform: "translate(-50%, -50%)",
              }}
              aria-label={
                occupied
                  ? `Seat ${seat.index}: ${assignment?.guestName}`
                  : `Seat ${seat.index}: available`
              }
              title={occupied ? assignment?.guestName : `Seat ${seat.index}`}
            >
              {occupied ? (
                <span className="inline-flex items-center gap-0.5">
                  {seatAdmitted && <CheckCircle2 className="h-2.5 w-2.5" />}
                  {assignment!.guestName.split(" ")[0]?.slice(0, 2)}
                </span>
              ) : (
                seat.index
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
