"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { MapPin, Armchair, Sparkles, Calendar, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { PageLoader } from "@/components/ui/page-loader";
import { Badge } from "@/components/ui/badge";
import { SeatingTableVisual } from "@/components/seating/seating-table-visual";
import type { GuestAssignmentView, SeatingTableConfig } from "@/lib/seating/seating-types";

interface SeatLookupData {
  guest: { id: string; name: string; status?: string };
  event: { id: string; title: string; startDate: string; venueName: string | null };
  assignment: {
    tableNumber: string;
    seatLabel: string | null;
    zone: string | null;
    notes: string | null;
    planName: string;
    admitted?: boolean;
  } | null;
  table: {
    label: string;
    shape: string;
    seatCount: number;
    zone?: string;
  } | null;
}

export default function SeatLookupPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<SeatLookupData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/seating/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
        else setError(d.error || "Not found");
      })
      .catch(() => setError("Could not load seating"));
  }, [token]);

  const tableConfig: SeatingTableConfig | null = useMemo(() => {
    if (!data?.table) return null;
    return {
      id: "guest-table",
      label: data.table.label,
      shape: (data.table.shape as SeatingTableConfig["shape"]) ?? "round",
      seatCount: data.table.seatCount,
      zone: data.table.zone,
    };
  }, [data?.table]);

  const guestAssignment: GuestAssignmentView[] = useMemo(() => {
    if (!data?.assignment) return [];
    return [
      {
        guestId: data.guest.id,
        guestName: data.guest.name,
        tableNumber: data.assignment.tableNumber,
        seatLabel: data.assignment.seatLabel ?? undefined,
        zone: data.assignment.zone ?? undefined,
        notes: data.assignment.notes ?? undefined,
        admitted: data.assignment.admitted,
        guestStatus: data.guest.status,
      },
    ];
  }, [data]);

  const highlightSeat = data?.assignment?.seatLabel
    ? parseInt(data.assignment.seatLabel, 10) || undefined
    : undefined;

  if (!data && !error) return <PageLoader label="Finding your seat…" className="min-h-screen" />;

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white p-6">
        <p className="text-center">{error || "Guest not found"}</p>
      </div>
    );
  }

  const { guest, event, assignment } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F172A] via-[#0B3D3A] to-[#0F172A] text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="inline-flex items-center gap-2 text-[#D4A63A] text-xs tracking-widest uppercase">
          <Sparkles className="h-4 w-4" /> Celeventic Seating
        </div>
        <h1 className="font-display text-2xl">{guest.name}</h1>
        <p className="text-white/60 text-sm">{event.title}</p>
        <div className="flex items-center justify-center gap-2 text-sm text-white/50">
          <Calendar className="h-4 w-4" />
          {formatDate(event.startDate)}
          {event.venueName && <span> · {event.venueName}</span>}
        </div>

        {assignment ? (
          <div className="space-y-6 inv-fade-in">
            {tableConfig ? (
              <div className="rounded-2xl border border-[#D4A63A]/30 bg-white/5 backdrop-blur p-6">
                <p className="text-xs uppercase tracking-widest text-white/50 mb-4">Your table</p>
                <div className="flex justify-center [&_*]:text-slate-900 [&_p]:text-slate-900 [&_.text-slate-400]:text-slate-500">
                  <SeatingTableVisual
                    table={tableConfig}
                    assignments={guestAssignment}
                    highlightSeat={highlightSeat}
                    interactive={false}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#D4A63A]/30 bg-white/5 backdrop-blur p-8 space-y-4">
                <Armchair className="h-10 w-10 mx-auto text-[#D4A63A]" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/50">Your table</p>
                  <p className="font-display text-4xl text-[#D4A63A] mt-1">{assignment.tableNumber}</p>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge className="bg-[#D4A63A]/20 text-[#D4A63A] border-[#D4A63A]/40">
                  Table {assignment.tableNumber}
                </Badge>
                {assignment.seatLabel && (
                  <Badge variant="outline" className="border-white/20 text-white/80">
                    Seat {assignment.seatLabel}
                  </Badge>
                )}
                {assignment.admitted ? (
                  <Badge className="bg-emerald-500/20 text-emerald-300 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Admitted
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-white/10 text-white/70">
                    Assigned
                  </Badge>
                )}
              </div>
              {assignment.zone && (
                <p className="text-sm text-white/60 flex items-center justify-center gap-1">
                  <MapPin className="h-4 w-4" /> {assignment.zone}
                </p>
              )}
              {assignment.notes && <p className="text-sm text-white/50 italic">{assignment.notes}</p>}
              <p className="text-[10px] text-white/30">{assignment.planName}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <p className="text-white/60">
              Your seat assignment will appear here once the host finalizes seating.
            </p>
          </div>
        )}

        <p className="text-xs text-white/40">Save this page or scan at the venue</p>
      </div>
    </div>
  );
}
