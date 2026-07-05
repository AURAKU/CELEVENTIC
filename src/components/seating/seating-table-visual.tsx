"use client";

import { useState, useRef, useEffect } from "react";
import { CheckCircle2, User, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GuestAssignmentView } from "@/lib/seating/seating-types";
import { computeSeatPositions } from "@/lib/seating/seating-layout";
import { normalizeTable } from "@/lib/seating/seating-types";
import type { SeatingTableConfig } from "@/lib/seating/seating-types";

interface SeatSlotProps {
  seatIndex: number;
  assignment?: GuestAssignmentView;
  interactive?: boolean;
  selected?: boolean;
  highlighted?: boolean;
  onSelect?: () => void;
}

function SeatSlot({ seatIndex, assignment, interactive, selected, highlighted, onSelect }: SeatSlotProps) {
  const [pinned, setPinned] = useState(false);
  const showPopup = pinned || selected;
  const occupied = Boolean(assignment);
  const admitted = assignment?.admitted || assignment?.guestStatus === "CHECKED_IN";

  return (
    <div className="relative">
      <button
        type="button"
        disabled={!interactive}
        onClick={(e) => {
          e.stopPropagation();
          if (interactive) {
            setPinned((p) => !p);
            onSelect?.();
          }
        }}
        onMouseEnter={() => !pinned && interactive && setPinned(true)}
        onMouseLeave={() => !selected && setPinned(false)}
        className={cn(
          "w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all touch-manipulation",
          interactive && "cursor-pointer hover:scale-110 active:scale-95",
          !interactive && "cursor-default",
          highlighted && "ring-2 ring-[#D4A63A] ring-offset-2 scale-110",
          occupied
            ? admitted
              ? "bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-500/30"
              : "bg-[#0B8A83] border-[#0B8A83] text-white shadow-md"
            : "bg-white border-slate-300 text-slate-400 hover:border-[#0B8A83] hover:text-[#0B8A83]",
          selected && !highlighted && "ring-2 ring-[#D4A63A] ring-offset-2"
        )}
        aria-label={occupied ? `Seat ${seatIndex}: ${assignment?.guestName}` : `Seat ${seatIndex}: empty`}
      >
        {occupied ? (
          <span className="truncate max-w-[2rem] text-[9px]">{assignment!.guestName.split(" ")[0]?.slice(0, 3)}</span>
        ) : (
          seatIndex
        )}
      </button>

      {(showPopup || selected) && occupied && assignment && (
        <div
          className={cn(
            "absolute z-30 left-1/2 -translate-x-1/2 bottom-full mb-2 w-44 rounded-xl border bg-white shadow-xl p-3 text-left pointer-events-none",
            "animate-in fade-in zoom-in-95 duration-150"
          )}
        >
          <p className="font-semibold text-sm text-slate-900 truncate">{assignment.guestName}</p>
          {assignment.guestEmail && (
            <p className="text-[10px] text-slate-500 truncate">{assignment.guestEmail}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-2">
            <Badge variant="outline" className="text-[9px]">
              Seat {assignment.seatLabel ?? seatIndex}
            </Badge>
            {admitted ? (
              <Badge className="text-[9px] bg-emerald-100 text-emerald-800 gap-0.5">
                <CheckCircle2 className="h-2.5 w-2.5" /> Admitted
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[9px]">Assigned</Badge>
            )}
          </div>
        </div>
      )}

      {(showPopup || selected) && !occupied && interactive && (
        <div className="absolute z-30 left-1/2 -translate-x-1/2 bottom-full mb-2 whitespace-nowrap rounded-lg bg-slate-900 text-white text-[10px] px-2 py-1 pointer-events-none">
          Tap to assign guest
        </div>
      )}
    </div>
  );
}

interface SeatingTableVisualProps {
  table: SeatingTableConfig;
  assignments: GuestAssignmentView[];
  interactive?: boolean;
  selectedSeat?: number | null;
  highlightSeat?: number | null;
  onSeatSelect?: (seatIndex: number) => void;
  className?: string;
}

export function SeatingTableVisual({
  table: rawTable,
  assignments,
  interactive = false,
  selectedSeat,
  highlightSeat,
  onSeatSelect,
  className,
}: SeatingTableVisualProps) {
  const table = normalizeTable(rawTable);
  const seats = computeSeatPositions(table.shape!, table.seatCount!);
  const tableAssignments = assignments.filter(
    (a) => a.tableNumber.trim().toLowerCase() === table.label.trim().toLowerCase()
  );

  function assignmentForSeat(seatIndex: number): GuestAssignmentView | undefined {
    const label = String(seatIndex);
    const exact = tableAssignments.find(
      (a) => a.seatLabel?.trim() === label || a.seatLabel?.trim() === `Seat ${label}`
    );
    if (exact) return exact;
    if (tableAssignments.length === 1 && !tableAssignments[0].seatLabel) {
      return seatIndex === 1 ? tableAssignments[0] : undefined;
    }
    return undefined;
  }

  const shapeClasses = {
    round: "rounded-full w-24 h-24 sm:w-28 sm:h-28",
    square: "rounded-xl w-24 h-24 sm:w-28 sm:h-28",
    rectangle: "rounded-xl w-32 h-20 sm:w-36 sm:h-24",
  };

  const filled = tableAssignments.length;
  const capacity = table.seatCount ?? 8;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="text-center space-y-0.5">
        <p className="font-semibold text-sm text-slate-900">{table.label}</p>
        {table.zone && <p className="text-[10px] text-slate-500 uppercase tracking-wide">{table.zone}</p>}
        <p className="text-[10px] text-slate-400">
          {filled}/{capacity} seated · {table.shape}
        </p>
      </div>

      <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
        <div
          className={cn(
            "absolute z-0 flex items-center justify-center border-2 border-[#D4A63A]/50 bg-gradient-to-br from-amber-50 to-white shadow-inner",
            shapeClasses[table.shape!]
          )}
        >
          <span className="font-display text-lg text-[#0B8A83] font-bold text-center px-1 leading-tight">
            {table.label.replace(/^Table\s*/i, "")}
          </span>
        </div>

        {seats.map((seat) => (
          <div
            key={seat.index}
            className="absolute z-10"
            style={{
              left: `calc(50% + ${seat.offsetX * 0.85}px)`,
              top: `calc(50% + ${seat.offsetY * 0.85}px)`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <SeatSlot
              seatIndex={seat.index}
              assignment={assignmentForSeat(seat.index)}
              interactive={interactive}
              selected={selectedSeat === seat.index}
              highlighted={highlightSeat === seat.index}
              onSelect={() => onSeatSelect?.(seat.index)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

interface SeatAssignPanelProps {
  tableLabel: string;
  seatIndex: number;
  guests: { id: string; name: string; email: string | null }[];
  currentGuestId?: string;
  onAssign: (guestId: string) => void;
  onUnassign: () => void;
  onClose: () => void;
}

export function SeatAssignPanel({
  tableLabel,
  seatIndex,
  guests,
  currentGuestId,
  onAssign,
  onUnassign,
  onClose,
}: SeatAssignPanelProps) {
  const [search, setSearch] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const filtered = guests.filter(
    (g) =>
      !search ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div
        ref={panelRef}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl border overflow-hidden max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
          <div>
            <p className="font-semibold text-sm">{tableLabel}</p>
            <p className="text-xs text-slate-500">Seat {seatIndex}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {currentGuestId ? (
          <div className="p-4 space-y-3">
            <p className="text-sm text-slate-600">Guest assigned to this seat.</p>
            <Button variant="destructive" size="sm" className="w-full" onClick={onUnassign}>
              Remove assignment
            </Button>
          </div>
        ) : (
          <>
            <div className="p-3 border-b">
              <Input
                placeholder="Search guests…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <ul className="overflow-y-auto flex-1 p-2 space-y-1">
              {filtered.length === 0 ? (
                <li className="text-center text-sm text-slate-500 py-8">No guests found</li>
              ) : (
                filtered.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-brand-50 transition-colors"
                      onClick={() => onAssign(g.id)}
                    >
                      <div className="h-8 w-8 rounded-full bg-[#0B8A83]/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-[#0B8A83]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{g.name}</p>
                        <p className="text-xs text-slate-500 truncate">{g.email ?? "—"}</p>
                      </div>
                      <UserPlus className="h-4 w-4 text-slate-400 ml-auto shrink-0" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
