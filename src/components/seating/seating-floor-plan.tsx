"use client";

import { cn } from "@/lib/utils";
import { SeatingTableVisual } from "@/components/seating/seating-table-visual";
import type { GuestAssignmentView, SeatingTableConfig } from "@/lib/seating/seating-types";

interface SeatingFloorPlanProps {
  tables: SeatingTableConfig[];
  assignments: GuestAssignmentView[];
  interactive?: boolean;
  selectedTableId?: string | null;
  selectedSeat?: number | null;
  onTableSelect?: (tableId: string) => void;
  onSeatSelect?: (tableId: string, seatIndex: number) => void;
  className?: string;
}

export function SeatingFloorPlan({
  tables,
  assignments,
  interactive = false,
  selectedTableId,
  selectedSeat,
  onTableSelect,
  onSeatSelect,
  className,
}: SeatingFloorPlanProps) {
  if (tables.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-12 text-center", className)}>
        <p className="text-sm font-medium text-slate-600">No tables yet</p>
        <p className="text-xs text-slate-400 mt-1">Add tables or auto-generate from your guest count.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-8 sm:gap-10",
        tables.length === 1 && "grid-cols-1 place-items-center",
        tables.length === 2 && "grid-cols-1 sm:grid-cols-2",
        tables.length >= 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {tables.map((table) => (
        <button
          key={table.id}
          type="button"
          className={cn(
            "rounded-2xl p-4 transition-all text-left w-full",
            interactive && "hover:bg-slate-50 cursor-pointer",
            selectedTableId === table.id && "ring-2 ring-[#0B8A83] bg-brand-50/50"
          )}
          onClick={(e) => {
            if (interactive) {
              e.stopPropagation();
              onTableSelect?.(table.id);
            }
          }}
        >
          <SeatingTableVisual
            table={table}
            assignments={assignments}
            interactive={interactive}
            selectedSeat={selectedTableId === table.id ? selectedSeat : null}
            onSeatSelect={(seatIndex) => {
              onSeatSelect?.(table.id, seatIndex);
            }}
          />
        </button>
      ))}
    </div>
  );
}
